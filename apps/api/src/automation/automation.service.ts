import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AutomationAction,
  AutomationTrigger,
  MessageSender,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { MessagesService } from '../messages/messages.service';
import { CreateAutomationDto } from './dto/automation.dto';

@Injectable()
export class AutomationService {
  constructor(
    private prisma: PrismaService,
    private whatsappService: WhatsAppService,
    private messagesService: MessagesService,
  ) {}

  list(workspaceId: string) {
    return this.prisma.automationRule.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(workspaceId: string, dto: CreateAutomationDto) {
    return this.prisma.automationRule.create({
      data: {
        workspaceId,
        name: dto.name,
        trigger: dto.trigger,
        action: dto.action,
        config: dto.config,
        enabled: dto.enabled ?? true,
      },
    });
  }

  async processNoReplyRules() {
    const rules = await this.prisma.automationRule.findMany({
      where: {
        enabled: true,
        trigger: AutomationTrigger.NO_REPLY_24H,
        action: AutomationAction.SEND_MESSAGE,
      },
    });

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    for (const rule of rules) {
      const config = rule.config as { message: string };
      const conversations = await this.prisma.conversation.findMany({
        where: {
          workspaceId: rule.workspaceId,
          lastSender: MessageSender.CONTACT,
          lastMessageAt: { lt: cutoff },
          OR: [
            { automationFiredAt: null },
            { automationFiredAt: { lt: cutoff } },
          ],
        },
        include: { contact: true },
        take: 50,
      });

      for (const conv of conversations) {
        try {
          await this.whatsappService.sendTextMessage(
            rule.workspaceId,
            conv.contact.phone,
            config.message,
          );
          await this.messagesService.createSystemMessage(
            conv.id,
            `[Automation] ${config.message}`,
          );
          await this.prisma.conversation.update({
            where: { id: conv.id },
            data: { automationFiredAt: new Date() },
          });
        } catch {
          // continue with next conversation
        }
      }
    }
  }

  async handleServiceCompleted(
    workspaceId: string,
    contactId: string,
    customerPhone: string,
    customerName: string,
  ) {
    const phone = (customerPhone || '').trim();
    if (!phone) {
      throw new BadRequestException('A customer WhatsApp number is required.');
    }

    // Resolve a real Contact for this phone so the ReviewRequest FK is valid.
    // We do NOT trust the caller-supplied contactId (the UI may send a placeholder);
    // instead we look up (or create) the contact by phone within this workspace.
    const contact = await this.resolveContact(workspaceId, phone, customerName, contactId);

    const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const requestLink = `${frontendUrl}/feedback/${workspaceId}?phone=${encodeURIComponent(phone)}&name=${encodeURIComponent(customerName || '')}`;

    // Honor a custom SERVICE_COMPLETED rule's message if one is configured;
    // otherwise send the standard feedback request. Either way we always send —
    // the tab's whole purpose is to fire the request on demand.
    const rules = await this.prisma.automationRule.findMany({
      where: {
        workspaceId,
        enabled: true,
        trigger: AutomationTrigger.SERVICE_COMPLETED,
        action: {
          in: [AutomationAction.SEND_FEEDBACK_REQUEST, AutomationAction.SEND_MESSAGE],
        },
      },
    });
    const ruleTemplate = (rules[0]?.config as { message?: string } | null)?.message;
    const messageText = ruleTemplate
      ? `${ruleTemplate} ${requestLink}`
      : `Thank you for choosing us 🙏. We would love to hear about your experience! Please rate us here: ${requestLink}`;

    // Send via WhatsApp. Let a hard failure propagate so the UI reports the truth
    // (in dev/sandbox this returns a simulated messageId rather than throwing).
    const result = await this.whatsappService.sendTextMessage(workspaceId, phone, messageText);
    const simulated = Boolean(
      (result?.raw as { simulated?: boolean; fallback?: boolean } | undefined)?.simulated ||
        (result?.raw as { simulated?: boolean; fallback?: boolean } | undefined)?.fallback,
    );

    const reviewRequest = await this.prisma.reviewRequest.create({
      data: {
        workspaceId,
        customerId: contact.id,
        platform: 'GOOGLE',
      },
    });

    return {
      sent: true,
      simulated,
      messageId: result?.messageId,
      reviewRequestId: reviewRequest.id,
      contactId: contact.id,
    };
  }

  /**
   * Find a contact by phone in the workspace, or by the supplied id, or create one.
   * Guarantees a real Contact row so ReviewRequest's foreign key is always valid.
   */
  private async resolveContact(
    workspaceId: string,
    phone: string,
    name: string,
    suppliedId?: string,
  ) {
    if (suppliedId) {
      const byId = await this.prisma.contact.findFirst({
        where: { id: suppliedId, workspaceId },
      });
      if (byId) return byId;
    }
    const byPhone = await this.prisma.contact.findFirst({
      where: { workspaceId, phone },
    });
    if (byPhone) return byPhone;
    return this.prisma.contact.create({
      data: { workspaceId, phone, name: name || phone },
    });
  }
}
