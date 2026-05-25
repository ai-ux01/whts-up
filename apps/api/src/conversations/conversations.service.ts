import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MessageSender, Prisma } from '@prisma/client';
import { normalizePhoneE164 } from '../common/utils/phone';
import { PrismaService } from '../prisma/prisma.service';
import {
  getLastCustomerMessageAt,
  sessionFields,
} from './conversation-session.helper';

@Injectable()
export class ConversationsService {
  constructor(private prisma: PrismaService) {}

  async list(
    workspaceId: string,
    params: { search?: string; unread?: string },
  ) {
    const where: Prisma.ConversationWhereInput = { workspaceId };

    if (params.unread === 'true') {
      where.unreadCount = { gt: 0 };
    }

    if (params.search) {
      where.contact = {
        OR: [
          { name: { contains: params.search, mode: 'insensitive' } },
          { phone: { contains: params.search } },
        ],
      };
    }

    const conversations = await this.prisma.conversation.findMany({
      where,
      include: {
        contact: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    const enriched = await Promise.all(
      conversations.map(async (c) => {
        const lastCustomerMessageAt = await getLastCustomerMessageAt(
          this.prisma,
          c.id,
        );
        return {
          id: c.id,
          contact: c.contact,
          lastMessageAt: c.lastMessageAt,
          unreadCount: c.unreadCount,
          lastSender: c.lastSender,
          lastMessage: c.messages[0] || null,
          ...sessionFields(lastCustomerMessageAt),
        };
      }),
    );
    return enriched;
  }

  async createOrGet(workspaceId: string, phone: string, name?: string) {
    const normalized = normalizePhoneE164(phone);
    if (!normalized) {
      throw new BadRequestException('Invalid phone number');
    }

    const contact = await this.prisma.contact.upsert({
      where: {
        workspaceId_phone: { workspaceId, phone: normalized },
      },
      create: { workspaceId, phone: normalized, name: name || null },
      update: name ? { name } : {},
    });

    let conversation = await this.prisma.conversation.findFirst({
      where: { workspaceId, contactId: contact.id },
      include: {
        contact: { include: { lead: { include: { assignedUser: true } } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: { workspaceId, contactId: contact.id },
        include: {
          contact: { include: { lead: { include: { assignedUser: true } } } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      });
    }

    const lastCustomerMessageAt = await getLastCustomerMessageAt(
      this.prisma,
      conversation.id,
    );
    return {
      id: conversation.id,
      contact: conversation.contact,
      lastMessageAt: conversation.lastMessageAt,
      unreadCount: conversation.unreadCount,
      lastSender: conversation.lastSender,
      lastMessage: conversation.messages[0] || null,
      ...sessionFields(lastCustomerMessageAt),
    };
  }

  async findOne(workspaceId: string, id: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, workspaceId },
      include: {
        contact: { include: { lead: { include: { assignedUser: true } } } },
      },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    const lastCustomerMessageAt = await getLastCustomerMessageAt(
      this.prisma,
      id,
    );
    return { ...conversation, ...sessionFields(lastCustomerMessageAt) };
  }

  async markRead(workspaceId: string, id: string) {
    await this.ensureConversation(workspaceId, id);
    return this.prisma.conversation.update({
      where: { id },
      data: { unreadCount: 0 },
    });
  }

  async ensureConversation(workspaceId: string, id: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, workspaceId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  async updateOnNewMessage(
    conversationId: string,
    sender: MessageSender,
    incrementUnread: boolean,
  ) {
    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        lastSender: sender,
        unreadCount: incrementUnread ? { increment: 1 } : undefined,
      },
      include: { contact: true },
    });
  }
}
