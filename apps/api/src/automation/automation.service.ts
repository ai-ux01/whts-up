import { Injectable } from '@nestjs/common';
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
    const rules = await this.prisma.automationRule.findMany({
      where: {
        workspaceId,
        enabled: true,
        trigger: AutomationTrigger.SERVICE_COMPLETED,
      },
    });

    for (const rule of rules) {
      if (
        rule.action === AutomationAction.SEND_FEEDBACK_REQUEST ||
        rule.action === AutomationAction.SEND_MESSAGE
      ) {
        const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const requestLink = `${frontendUrl}/feedback/${workspaceId}?phone=${encodeURIComponent(customerPhone)}&name=${encodeURIComponent(customerName)}`;
        const messageText = `Thank you for choosing us 🙏. We would love to hear about your experience! Please rate us here: ${requestLink}`;

        try {
          await this.whatsappService.sendTextMessage(workspaceId, customerPhone, messageText);

          // Log ReviewRequest in database
          await this.prisma.reviewRequest.create({
            data: {
              workspaceId,
              customerId: contactId,
              platform: 'GOOGLE',
            },
          });
        } catch {
          // suppress WhatsApp failures for sandboxing
        }
      }
    }
  }
}
