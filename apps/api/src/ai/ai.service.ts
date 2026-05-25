import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LeadStatus, MessageSender } from '@prisma/client';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { MessagesService } from '../messages/messages.service';
import { ConversationsService } from '../conversations/conversations.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private client: OpenAI | null = null;
  private chatModel = 'gpt-4o-mini';
  private embeddingModel = 'nomic-embed-text';
  private useOllama = false;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    @Inject(forwardRef(() => MessagesService))
    private messagesService: MessagesService,
    private conversationsService: ConversationsService,
    @Inject(forwardRef(() => WhatsAppService))
    private whatsappService: WhatsAppService,
    private realtime: RealtimeGateway,
  ) {
    this.useOllama = this.config.get<string>('OLLAMA_MODE') === 'on';
    this.chatModel =
      this.config.get<string>('AI_MODEL') ||
      (this.useOllama ? 'llama3.2:latest' : 'gpt-4o-mini');
    this.embeddingModel =
      this.config.get<string>('EMBEDDING_MODEL') || 'nomic-embed-text';

    if (this.useOllama) {
      const baseURL =
        this.config.get<string>('OLLAMA_BASE_URL') ||
        'http://127.0.0.1:11434/v1';
      this.client = new OpenAI({ baseURL, apiKey: 'ollama' });
      this.logger.log(
        `AI provider: Ollama (${this.chatModel}), embeddings: ${this.embeddingModel}`,
      );
    } else {
      const apiKey = this.config.get<string>('OPENAI_API_KEY');
      if (apiKey) {
        this.client = new OpenAI({ apiKey });
        this.logger.log(`AI provider: OpenAI (${this.chatModel})`);
      }
    }
  }

  private isConfigured(): boolean {
    return this.client !== null;
  }

  async maybeAutoReply(workspaceId: string, conversationId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace?.aiEnabled || !this.isConfigured()) return;

    const recent = await this.messagesService.getRecentMessages(
      conversationId,
      10,
    );
    const last = recent[0];
    if (!last || last.sender !== MessageSender.CONTACT) return;

    const agentRecent = recent.find(
      (m) =>
        m.sender === MessageSender.AGENT &&
        Date.now() - m.createdAt.getTime() < 5 * 60 * 1000,
    );
    if (agentRecent) return;

    const conversation = await this.conversationsService.findOne(
      workspaceId,
      conversationId,
    );

    const lead = conversation.contact.lead;
    if (lead?.status === LeadStatus.CLOSED) return;

    const reply = await this.generateReply({
      systemPrompt:
        workspace.aiSystemPrompt ||
        `You are a helpful assistant for ${workspace.businessName || workspace.name}.`,
      messages: recent.reverse().map((m) => ({
        role:
          m.sender === MessageSender.CONTACT
            ? ('user' as const)
            : ('assistant' as const),
        content: m.content,
      })),
      leadContext: lead
        ? `Lead status: ${lead.status}. Tags: ${lead.tags.join(', ') || 'none'}.`
        : '',
    });

    if (!reply) return;

    const message = await this.messagesService.createAiMessage(
      conversationId,
      reply,
    );

    await this.conversationsService.updateOnNewMessage(
      conversationId,
      MessageSender.AI,
      false,
    );

    try {
      const sendResult = await this.whatsappService.sendTextMessage(
        workspaceId,
        conversation.contact.phone,
        reply,
      );
      if (sendResult.messageId) {
        await this.prisma.message.update({
          where: { id: message.id },
          data: {
            externalId: sendResult.messageId,
            deliveryStatus: 'sent',
          },
        });
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'AI reply WhatsApp send failed';
      this.logger.warn(errorMsg);
      await this.prisma.message.update({
        where: { id: message.id },
        data: { metadata: { deliveryFailed: true, error: errorMsg } },
      });
    }

    const updatedConversation = await this.conversationsService.findOne(
      workspaceId,
      conversationId,
    );

    this.realtime.emitNewMessage(workspaceId, {
      message,
      conversation: updatedConversation,
    });
  }

  async generateReply(params: {
    systemPrompt: string;
    messages: { role: 'user' | 'assistant'; content: string }[];
    leadContext: string;
  }): Promise<string | null> {
    if (!this.client) {
      this.logger.warn(
        this.useOllama
          ? 'Ollama not reachable — start with: ollama serve'
          : 'OPENAI_API_KEY not configured',
      );
      return null;
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: this.chatModel,
        messages: [
          {
            role: 'system',
            content: `${params.systemPrompt}\n\n${params.leadContext}\nReply in Hindi, English, or Hinglish matching the customer. Be concise.`,
          },
          ...params.messages,
        ],
        max_tokens: 300,
        temperature: 0.7,
      });

      return completion.choices[0]?.message?.content?.trim() || null;
    } catch (err) {
      this.logger.error(
        this.useOllama ? 'Ollama chat error' : 'OpenAI chat error',
        err,
      );
      return null;
    }
  }

  /** Ollama/OpenAI-compatible embeddings (for future RAG). */
  async embedText(text: string): Promise<number[] | null> {
    if (!this.client || !this.useOllama) return null;

    try {
      const res = await this.client.embeddings.create({
        model: this.embeddingModel,
        input: text,
      });
      return res.data[0]?.embedding ?? null;
    } catch (err) {
      this.logger.warn('Ollama embedding error', err);
      return null;
    }
  }
}
