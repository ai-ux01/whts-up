import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessageSender, MessageType, RecipientStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { ConversationsService } from '../conversations/conversations.service';
import { MessagesService } from '../messages/messages.service';
import { LeadsService } from '../leads/leads.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { AiService } from '../ai/ai.service';
import * as crypto from 'crypto';
import { formatWhatsAppApiError } from '../common/utils/whatsapp-errors';
import {
  attributionFromReferral,
  type WhatsAppReferral,
} from '../common/utils/attribution';

interface WhatsAppWebhookBody {
  object?: string;
  entry?: Array<{
    id: string;
    changes?: Array<{
      value?: {
        metadata?: { phone_number_id?: string; display_phone_number?: string };
        contacts?: Array<{ profile?: { name?: string }; wa_id: string }>;
        messages?: Array<{
          id: string;
          from: string;
          timestamp: string;
          type: string;
          referral?: WhatsAppReferral;
          text?: { body: string };
          image?: { id: string; caption?: string };
          document?: { id: string; filename?: string };
          audio?: { id: string };
        }>;
        statuses?: Array<{
          id: string;
          status: string;
          recipient_id: string;
        }>;
      };
    }>;
  }>;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly graphUrl = 'https://graph.facebook.com/v21.0';

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private workspacesService: WorkspacesService,
    private conversationsService: ConversationsService,
    @Inject(forwardRef(() => MessagesService))
    private messagesService: MessagesService,
    private leadsService: LeadsService,
    private realtime: RealtimeGateway,
    @Inject(forwardRef(() => AiService))
    private aiService: AiService,
  ) {}

  /** Meta GET /webhook — returns HTTP status + body for the controller. */
  async resolveWebhookVerification(
    mode: string | undefined,
    token: string | undefined,
    challenge: string | undefined,
  ): Promise<{ statusCode: number; body: string }> {
    const trimmedToken = token?.trim();

    // Browser / health check without Meta query params (not an error)
    if (!mode && !trimmedToken && !challenge) {
      return {
        statusCode: 200,
        body:
          'WhatsApp webhook is reachable. In Meta Developer Console use Verify and save with hub.mode=subscribe and the same verify token as WHATSAPP_VERIFY_TOKEN in apps/api/.env (or Settings).',
      };
    }

    if (mode !== 'subscribe' || !trimmedToken || !challenge) {
      return {
        statusCode: 400,
        body: 'Missing or invalid hub.mode, hub.verify_token, or hub.challenge.',
      };
    }

    const envToken = this.config.get<string>('WHATSAPP_VERIFY_TOKEN')?.trim();
    if (envToken && trimmedToken === envToken) {
      this.logger.log('Webhook verified (WHATSAPP_VERIFY_TOKEN)');
      return { statusCode: 200, body: challenge };
    }

    const workspace = await this.prisma.workspace.findFirst({
      where: { webhookVerifyToken: trimmedToken },
    });
    if (workspace) {
      this.logger.log(`Webhook verified (workspace ${workspace.id})`);
      return { statusCode: 200, body: challenge };
    }

    this.logger.warn(
      `Webhook verification failed — token mismatch (received length ${trimmedToken.length}). Meta must use the same value as WHATSAPP_VERIFY_TOKEN${envToken ? '' : ' (not set in .env)'} or Webhook Verify Token in Settings.`,
    );
    return {
      statusCode: 403,
      body:
        'Verify token mismatch. Use the exact same string in Meta Developer Console, apps/api/.env WHATSAPP_VERIFY_TOKEN, and Settings → Webhook Verify Token.',
    };
  }

  validateSignature(rawBody: Buffer, signature: string | undefined): boolean {
    const secret = this.config.get<string>('META_APP_SECRET');
    const isProd = this.config.get<string>('NODE_ENV') === 'production';

    if (isProd) {
      if (!secret) {
        this.logger.error('META_APP_SECRET required in production');
        return false;
      }
      if (!signature) return false;
    } else if (!secret || !signature) {
      return true;
    }

    const expected =
      'sha256=' +
      crypto.createHmac('sha256', secret!).update(rawBody).digest('hex');
    if (signature!.length !== expected.length) return false;
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature!),
        Buffer.from(expected),
      );
    } catch {
      return false;
    }
  }

  async handleWebhook(body: WhatsAppWebhookBody) {
    if (body.object !== 'whatsapp_business_account') return;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;
        if (!value) continue;

        const phoneNumberId = value.metadata?.phone_number_id;
        if (!phoneNumberId) continue;

        const workspace =
          await this.workspacesService.findByPhoneNumberId(phoneNumberId);
        if (!workspace) {
          this.logger.warn(`No workspace for phone number ${phoneNumberId}`);
          continue;
        }

        if (value.messages?.length) {
          for (const msg of value.messages) {
            const contactName =
              value.contacts?.find((c) => c.wa_id === msg.from)?.profile
                ?.name || undefined;
            await this.processInboundMessage(
              workspace.id,
              msg,
              contactName,
            );
          }
        }

        if (value.statuses?.length) {
          await this.processStatuses(value.statuses);
        }
      }
    }
  }

  private extractMessageId(response: unknown): string | null {
    const r = response as { messages?: Array<{ id: string }> };
    return r.messages?.[0]?.id ?? null;
  }

  private async processInboundMessage(
    workspaceId: string,
    msg: {
      id: string;
      from: string;
      type: string;
      referral?: WhatsAppReferral;
      text?: { body: string };
      image?: { id: string; caption?: string };
      document?: { id: string; filename?: string };
      audio?: { id: string };
    },
    contactName?: string,
  ) {
    const existing = await this.prisma.processedWebhookEvent.findUnique({
      where: { wamid: msg.id },
    });
    if (existing) {
      this.logger.debug(`Skipping duplicate webhook message ${msg.id}`);
      return;
    }

    const phone = `+${msg.from}`;
    const { content, type, metadata } = this.parseMessageContent(msg);

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    const attribution = attributionFromReferral(
      msg.referral,
      workspace?.defaultUtmSource,
    );

    const contactData: {
      name?: string;
      leadSource?: string;
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
    } = contactName ? { name: contactName } : {};

    if (attribution) {
      contactData.leadSource = attribution.leadSource;
      contactData.utmSource = attribution.utmSource;
      contactData.utmMedium = attribution.utmMedium;
      contactData.utmCampaign = attribution.utmCampaign;
    }

    const contact = await this.prisma.contact.upsert({
      where: { workspaceId_phone: { workspaceId, phone } },
      create: {
        workspaceId,
        phone,
        name: contactName,
        ...attribution,
      },
      update: contactData,
    });

    let conversation = await this.prisma.conversation.findFirst({
      where: { workspaceId, contactId: contact.id },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: { workspaceId, contactId: contact.id },
      });
    }

    const message = await this.messagesService.createInboundMessage({
      conversationId: conversation.id,
      content,
      type,
      externalId: msg.id,
      metadata,
    });

    await this.conversationsService.updateOnNewMessage(
      conversation.id,
      MessageSender.CONTACT,
      true,
    );

    await this.leadsService.upsertFromContact(workspaceId, contact.id, {
      leadSource: contact.leadSource ?? attribution?.leadSource,
    });

    const updatedConversation = await this.conversationsService.findOne(
      workspaceId,
      conversation.id,
    );

    this.realtime.emitNewMessage(workspaceId, {
      message,
      conversation: updatedConversation,
    });

    await this.prisma.processedWebhookEvent.create({
      data: { wamid: msg.id },
    });

    // AI auto-reply
    await this.aiService.maybeAutoReply(workspaceId, conversation.id);
  }

  private parseMessageContent(msg: {
    type: string;
    text?: { body: string };
    image?: { id: string; caption?: string };
    document?: { id: string; filename?: string };
    audio?: { id: string };
  }): {
    content: string;
    type: MessageType;
    metadata?: Record<string, unknown>;
  } {
    if (msg.type === 'text' && msg.text) {
      return { content: msg.text.body, type: MessageType.TEXT };
    }
    if (msg.type === 'image' && msg.image) {
      return {
        content: msg.image.caption || '[Image]',
        type: MessageType.IMAGE,
        metadata: { mediaId: msg.image.id },
      };
    }
    if (msg.type === 'document' && msg.document) {
      return {
        content: msg.document.filename || '[Document]',
        type: MessageType.DOCUMENT,
        metadata: { mediaId: msg.document.id },
      };
    }
    if (msg.type === 'audio' && msg.audio) {
      return {
        content: '[Audio message]',
        type: MessageType.AUDIO,
        metadata: { mediaId: msg.audio.id },
      };
    }
    return { content: `[${msg.type}]`, type: MessageType.TEXT };
  }

  private mapDeliveryStatus(
    metaStatus: string,
  ): string | null {
    const s = metaStatus.toLowerCase();
    if (s === 'sent') return 'sent';
    if (s === 'delivered') return 'delivered';
    if (s === 'read') return 'read';
    if (s === 'failed') return 'failed';
    return null;
  }

  private mapRecipientStatus(metaStatus: string): RecipientStatus | null {
    const s = metaStatus.toLowerCase();
    if (s === 'sent') return RecipientStatus.SENT;
    if (s === 'delivered' || s === 'read') return RecipientStatus.DELIVERED;
    if (s === 'failed') return RecipientStatus.FAILED;
    return null;
  }

  private async processStatuses(
    statuses: Array<{ id: string; status: string; recipient_id: string }>,
  ) {
    for (const status of statuses || []) {
      const deliveryStatus = this.mapDeliveryStatus(status.status);
      if (!deliveryStatus) continue;

      const message = await this.prisma.message.findFirst({
        where: { externalId: status.id },
      });
      if (message) {
        await this.prisma.message.update({
          where: { id: message.id },
          data: { deliveryStatus },
        });
        const conv = await this.prisma.conversation.findUnique({
          where: { id: message.conversationId },
        });
        if (conv) {
          this.realtime.emitMessageStatus(conv.workspaceId, {
            messageId: message.id,
            conversationId: message.conversationId,
            deliveryStatus,
          });
        }
      }

      const recipientStatus = this.mapRecipientStatus(status.status);
      if (recipientStatus) {
        await this.prisma.campaignRecipient.updateMany({
          where: { externalMessageId: status.id },
          data: {
            status: recipientStatus,
            ...(recipientStatus === RecipientStatus.DELIVERED
              ? { sentAt: new Date() }
              : {}),
          },
        });
      }

      this.logger.debug(
        `Message status ${status.id}: ${status.status} for ${status.recipient_id}`,
      );
    }
  }

  async sendTextMessage(workspaceId: string, to: string, text: string) {
    const { phoneNumberId, accessToken, tokenSource } =
      await this.workspacesService.getWhatsAppCredentials(workspaceId);
    if (!phoneNumberId || !accessToken) {
      throw new Error(
        'WhatsApp not configured. Add Phone Number ID and Access Token in Settings or apps/api/.env.',
      );
    }

    const phone = to.replace(/\D/g, '');
    const url = `${this.graphUrl}/${phoneNumberId}/messages`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: text },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      this.logger.error(
        `WhatsApp send failed (token source: ${tokenSource}): ${err}`,
      );
      throw new Error(formatWhatsAppApiError(err, 'text message'));
    }

    const json = await res.json();
    return { raw: json, messageId: this.extractMessageId(json) };
  }

  async sendTemplateMessage(
    workspaceId: string,
    to: string,
    templateName: string,
    params: Record<string, string> = {},
    languageCode = 'en_US',
  ) {
    const { phoneNumberId, accessToken, tokenSource } =
      await this.workspacesService.getWhatsAppCredentials(workspaceId);
    if (!phoneNumberId || !accessToken) {
      throw new Error('WhatsApp not configured');
    }

    const phone = to.replace(/\D/g, '');
    const bodyParams = { ...params };
    delete bodyParams._language;
    const components = Object.keys(bodyParams).length
      ? [
          {
            type: 'body',
            parameters: Object.values(bodyParams).map((value) => ({
              type: 'text',
              text: value,
            })),
          },
        ]
      : [];

    const url = `${this.graphUrl}/${phoneNumberId}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: (params._language as string) || languageCode,
          },
          components,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      this.logger.error(
        `WhatsApp template failed (token source: ${tokenSource}): ${err}`,
      );
      throw new Error(formatWhatsAppApiError(err, 'template'));
    }

    const json = await res.json();
    return { raw: json, messageId: this.extractMessageId(json) };
  }

  async listMessageTemplates(workspaceId: string) {
    const { phoneNumberId, accessToken } =
      await this.workspacesService.getWhatsAppCredentials(workspaceId);
    if (!phoneNumberId || !accessToken) {
      throw new BadRequestException('WhatsApp not configured');
    }

    const wabaRes = await fetch(
      `${this.graphUrl}/${phoneNumberId}?fields=whatsapp_business_account`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!wabaRes.ok) {
      return { templates: [], error: 'Could not resolve WhatsApp Business Account' };
    }
    const wabaData = (await wabaRes.json()) as {
      whatsapp_business_account?: { id?: string };
    };
    const wabaId = wabaData.whatsapp_business_account?.id;
    if (!wabaId) {
      return { templates: [], error: 'WABA ID not found for this phone number' };
    }

    const url = `${this.graphUrl}/${wabaId}/message_templates?limit=50&fields=name,status,language`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const err = await res.text();
      this.logger.warn(`listMessageTemplates failed: ${err}`);
      return { templates: [], error: formatWhatsAppApiError(err, 'templates') };
    }

    const data = (await res.json()) as {
      data?: Array<{
        name: string;
        status: string;
        language: string;
      }>;
    };
    const templates = (data.data || [])
      .filter((t) => t.status === 'APPROVED')
      .map((t) => ({
        name: t.name,
        language: t.language,
        status: t.status,
      }));
    return { templates };
  }

  async sendTestMessage(
    workspaceId: string,
    phone: string,
    message?: string,
  ) {
    const templateName =
      this.config.get<string>('WHATSAPP_TEST_TEMPLATE') || 'hello_world';
    try {
      const result = await this.sendTemplateMessage(
        workspaceId,
        phone,
        templateName,
        {},
        'en_US',
      );
      return {
        ok: true,
        method: 'template' as const,
        templateName,
        messageId: result.messageId,
      };
    } catch (templateErr) {
      if (!message?.trim()) {
        throw templateErr;
      }
      const result = await this.sendTextMessage(
        workspaceId,
        phone,
        message.trim(),
      );
      return {
        ok: true,
        method: 'text' as const,
        messageId: result.messageId,
      };
    }
  }
}
