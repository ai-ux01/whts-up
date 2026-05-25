import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  forwardRef,
} from '@nestjs/common';
import { MessageSender, MessageType } from '@prisma/client';
import { getLastCustomerMessageAt, sessionFields } from '../conversations/conversation-session.helper';
import { isSessionOpen } from '../common/utils/whatsapp-session';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationsService } from '../conversations/conversations.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { AuthUser } from '../common/types';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private prisma: PrismaService,
    private conversationsService: ConversationsService,
    @Inject(forwardRef(() => WhatsAppService))
    private whatsappService: WhatsAppService,
    private realtime: RealtimeGateway,
  ) {}

  async listMessages(workspaceId: string, conversationId: string, cursor?: string) {
    await this.conversationsService.ensureConversation(workspaceId, conversationId);

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      include: { senderUser: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
      take: 100,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    return messages;
  }

  async sendAgentMessage(
    user: AuthUser,
    conversationId: string,
    content: string,
    forceSend?: boolean,
  ) {
    const workspaceId = user.workspaceId!;
    const conversation = await this.conversationsService.findOne(
      workspaceId,
      conversationId,
    );

    const lastCustomerMessageAt = await getLastCustomerMessageAt(
      this.prisma,
      conversationId,
    );
    if (!forceSend && !isSessionOpen(lastCustomerMessageAt)) {
      throw new BadRequestException(
        '24-hour messaging window is closed. The contact must message you first, or use an approved template in Campaigns. Pass forceSend to attempt anyway.',
      );
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        sender: MessageSender.AGENT,
        senderUserId: user.id,
        content,
        type: MessageType.TEXT,
      },
      include: { senderUser: { select: { id: true, name: true } } },
    });

    await this.conversationsService.updateOnNewMessage(
      conversationId,
      MessageSender.AGENT,
      false,
    );

    let deliveryError: string | null = null;
    let deliveryStatus: string | null = null;
    let externalId: string | null = null;
    try {
      const sendResult = await this.whatsappService.sendTextMessage(
        workspaceId,
        conversation.contact.phone,
        content,
      );
      externalId = sendResult.messageId;
      deliveryStatus = 'sent';
      await this.prisma.message.update({
        where: { id: message.id },
        data: { externalId, deliveryStatus },
      });
    } catch (err) {
      deliveryError =
        err instanceof Error ? err.message : 'Failed to send via WhatsApp';
      deliveryStatus = 'failed';
      this.logger.warn(`WhatsApp delivery failed: ${deliveryError}`);
      await this.prisma.message.update({
        where: { id: message.id },
        data: {
          deliveryStatus: 'failed',
          metadata: { deliveryFailed: true, error: deliveryError },
        },
      });
    }

    const updatedConversation = await this.conversationsService.findOne(
      workspaceId,
      conversationId,
    );

    const result = {
      ...message,
      externalId: externalId ?? message.externalId,
      deliveryStatus: deliveryStatus ?? message.deliveryStatus,
      metadata: deliveryError
        ? { deliveryFailed: true, error: deliveryError }
        : message.metadata,
      deliveryError,
      ...sessionFields(lastCustomerMessageAt),
    };

    this.realtime.emitNewMessage(workspaceId, {
      message: result,
      conversation: updatedConversation,
    });

    return result;
  }

  async createInboundMessage(data: {
    conversationId: string;
    content: string;
    type: MessageType;
    externalId?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.message.create({
      data: {
        conversationId: data.conversationId,
        sender: MessageSender.CONTACT,
        content: data.content,
        type: data.type,
        externalId: data.externalId,
        metadata: data.metadata as object,
      },
    });
  }

  async createAiMessage(conversationId: string, content: string) {
    return this.prisma.message.create({
      data: {
        conversationId,
        sender: MessageSender.AI,
        content,
        type: MessageType.TEXT,
      },
    });
  }

  async createSystemMessage(conversationId: string, content: string) {
    return this.prisma.message.create({
      data: {
        conversationId,
        sender: MessageSender.SYSTEM,
        content,
        type: MessageType.TEXT,
      },
    });
  }

  async getRecentMessages(conversationId: string, limit = 10) {
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
