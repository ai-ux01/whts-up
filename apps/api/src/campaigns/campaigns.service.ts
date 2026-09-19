import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CampaignStatus, RecipientStatus, Channel } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import { normalizePhoneE164 } from '../common/utils/phone';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { CreateCampaignDto } from './dto/campaign.dto';
import { QueueService } from '../queue/queue.service';
import { SegmentsService } from '../segments/segments.service';
import { InstagramService } from '../integrations/instagram.service';
import { SmsService } from '../integrations/sms.service';
import { EmailService } from '../integrations/email.service';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private prisma: PrismaService,
    private whatsappService: WhatsAppService,
    private config: ConfigService,
    @Inject(forwardRef(() => QueueService))
    private queueService: QueueService,
    private segmentsService: SegmentsService,
    private instagramService: InstagramService,
    private smsService: SmsService,
    private emailService: EmailService,
  ) {}

  private mapCampaignList(
    campaigns: Array<{
      id: string;
      name: string;
      templateName: string | null;
      status: CampaignStatus;
      scheduledAt: Date | null;
      createdAt: Date;
      channel: Channel;
      subject: string | null;
      body: string | null;
      recipients: Array<{
        status: RecipientStatus;
        error: string | null;
        readAt: Date | null;
        repliedAt: Date | null;
        clickedAt: Date | null;
      }>;
    }>,
  ) {
    return campaigns.map((c) => {
      const stats = { pending: 0, sent: 0, failed: 0, read: 0, replied: 0, clicked: 0 };
      for (const r of c.recipients) {
        if (r.status === RecipientStatus.PENDING) stats.pending++;
        else if (r.status === RecipientStatus.SENT || r.status === RecipientStatus.DELIVERED) stats.sent++;
        else if (r.status === RecipientStatus.FAILED) stats.failed++;

        if (r.readAt) stats.read++;
        if (r.repliedAt) stats.replied++;
        if (r.clickedAt) stats.clicked++;
      }
      const lastError = c.recipients.find((r) => r.error)?.error ?? null;
      return {
        id: c.id,
        name: c.name,
        templateName: c.templateName,
        status: c.status,
        scheduledAt: c.scheduledAt,
        createdAt: c.createdAt,
        channel: c.channel,
        subject: c.subject,
        body: c.body,
        _count: { recipients: c.recipients.length },
        recipientStats: stats,
        lastError,
      };
    });
  }

  async list(workspaceId: string) {
    const campaigns = await this.prisma.campaign.findMany({
      where: { workspaceId },
      include: {
        recipients: {
          select: {
            status: true,
            error: true,
            readAt: true,
            repliedAt: true,
            clickedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return this.mapCampaignList(campaigns);
  }

  async create(workspaceId: string, dto: CreateCampaignDto) {
    return this.prisma.campaign.create({
      data: {
        workspaceId,
        name: dto.name,
        templateName: dto.templateName || null,
        templateParams: dto.templateParams || {},
        segmentId: dto.segmentId || null,
        channel: dto.channel || Channel.WHATSAPP,
        subject: dto.subject || null,
        body: dto.body || null,
        status: CampaignStatus.DRAFT,
      },
    });
  }

  async findOne(workspaceId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, workspaceId },
      include: {
        recipients: { orderBy: { createdAt: 'asc' } },
        segment: true,
      },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  async uploadCsv(workspaceId: string, campaignId: string, file: Buffer) {
    const campaign = await this.findOne(workspaceId, campaignId);
    if (
      campaign.status !== CampaignStatus.DRAFT &&
      campaign.status !== CampaignStatus.SCHEDULED
    ) {
      throw new BadRequestException(
        'Cannot upload CSV to a campaign that is already running or completed',
      );
    }

    let records: Record<string, string>[];
    try {
      records = parse(file, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch {
      throw new BadRequestException('Invalid CSV file');
    }

    const recipients = records
      .map((row) => {
        const raw = (row.phone || row.Phone || row.PHONE || '').trim();
        const phone = normalizePhoneE164(raw);
        return {
          phone,
          name: (row.name || row.Name || '').trim() || undefined,
        };
      })
      .filter((r) => r.phone);

    if (!recipients.length) {
      throw new BadRequestException('No valid phone numbers in CSV');
    }

    // Replace recipients on re-upload
    await this.prisma.campaignRecipient.deleteMany({ where: { campaignId } });
    await this.prisma.campaignRecipient.createMany({
      data: recipients.map((r) => ({
        campaignId,
        phone: r.phone,
        name: r.name,
        status: RecipientStatus.PENDING,
      })),
    });

    if (campaign.status === CampaignStatus.SCHEDULED) {
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: { status: CampaignStatus.DRAFT },
      });
    }

    return { imported: recipients.length };
  }

  async schedule(
    workspaceId: string,
    campaignId: string,
    scheduledAt?: string,
  ) {
    const campaign = await this.findOne(workspaceId, campaignId);

    if (campaign.segmentId) {
      const contacts = await this.segmentsService.resolveSegmentContacts(workspaceId, campaign.segmentId);
      if (!contacts.length) {
        throw new BadRequestException('The selected segment has 0 matching contacts.');
      }

      await this.prisma.campaignRecipient.deleteMany({ where: { campaignId } });
      await this.prisma.campaignRecipient.createMany({
        data: contacts.map((c) => ({
          campaignId,
          phone: c.phone,
          name: c.name,
          status: RecipientStatus.PENDING,
        })),
      });

      // Reload recipients
      campaign.recipients = await this.prisma.campaignRecipient.findMany({
        where: { campaignId },
      });
    } else {
      const recipientCount = campaign.recipients.length;
      if (!recipientCount) {
        throw new BadRequestException('Upload CSV recipients before scheduling');
      }
    }

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.SCHEDULED,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
      },
    });

    return this.queueService.enqueueCampaign(campaignId).then((r) => ({
      scheduled: true,
      ...r,
    }));
  }

  async sendNow(workspaceId: string, campaignId: string) {
    const campaign = await this.findOne(workspaceId, campaignId);

    if (campaign.segmentId) {
      const contacts = await this.segmentsService.resolveSegmentContacts(workspaceId, campaign.segmentId);
      if (!contacts.length) {
        throw new BadRequestException('The selected segment has 0 matching contacts.');
      }

      await this.prisma.campaignRecipient.deleteMany({ where: { campaignId } });
      await this.prisma.campaignRecipient.createMany({
        data: contacts.map((c) => ({
          campaignId,
          phone: c.phone,
          name: c.name,
          status: RecipientStatus.PENDING,
        })),
      });
    } else {
      await this.prisma.campaignRecipient.updateMany({
        where: {
          campaignId,
          status: { in: [RecipientStatus.FAILED, RecipientStatus.PENDING] },
        },
        data: { status: RecipientStatus.PENDING, error: null },
      });
    }

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.SCHEDULED,
        scheduledAt: new Date(),
        completedAt: null,
      },
    });

    return this.queueService.enqueueCampaign(campaignId, false);
  }

  async getJobStatus(workspaceId: string, campaignId: string) {
    await this.findOne(workspaceId, campaignId);
    const job = await this.queueService.getCampaignJobState(campaignId);
    return {
      queueMode: this.queueService.getMode(),
      job,
    };
  }

  async processScheduledCampaigns() {
    const campaigns = await this.prisma.campaign.findMany({
      where: {
        status: CampaignStatus.SCHEDULED,
        scheduledAt: { lte: new Date() },
      },
      select: { id: true },
    });

    for (const { id } of campaigns) {
      try {
        await this.queueService.enqueueCampaign(id);
      } catch (err) {
        this.logger.error(`Campaign ${id} enqueue failed`, err);
      }
    }
  }

  /** Runs in API process (inline) or BullMQ worker (redis). */
  async runCampaign(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        recipients: { where: { status: RecipientStatus.PENDING } },
      },
    });

    if (!campaign || !campaign.recipients.length) {
      return { sent: 0, failed: 0, message: 'No pending recipients' };
    }

    await this.prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: CampaignStatus.RUNNING, startedAt: new Date() },
    });

    const apiBaseUrl =
      this.config.get<string>('API_URL') ||
      `http://localhost:${this.config.get('PORT') || 4000}/api/v1`;

    let sent = 0;
    let failed = 0;

    for (const recipient of campaign.recipients) {
      try {
        if (campaign.channel === Channel.WHATSAPP) {
          const params = (campaign.templateParams as Record<string, string>) || {};
          const languageCode =
            params._language ||
            this.config.get<string>('WHATSAPP_TEMPLATE_LANGUAGE') ||
            'en_US';

          this.logger.log(
            `Sending template "${campaign.templateName}" to ${recipient.phone}`,
          );

          // Dynamically wrap links and interpolate placeholders in parameters
          const processedParams: Record<string, string> = {};
          for (const [key, val] of Object.entries(params)) {
            let resolvedVal = val;
            if (val === '{{contact.name}}') {
              resolvedVal = recipient.name || 'Customer';
            } else if (val === '{{contact.phone}}') {
              resolvedVal = recipient.phone;
            }

            if (resolvedVal && (resolvedVal.startsWith('http://') || resolvedVal.startsWith('https://'))) {
              processedParams[key] = `${apiBaseUrl}/whatsapp/track/${recipient.id}?url=${encodeURIComponent(resolvedVal)}`;
            } else {
              processedParams[key] = resolvedVal;
            }
          }

          const sendResult = await this.whatsappService.sendTemplateMessage(
            campaign.workspaceId,
            recipient.phone,
            campaign.templateName!,
            processedParams,
            languageCode,
          );
          await this.prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status: RecipientStatus.SENT,
              sentAt: new Date(),
              error: null,
              externalMessageId: sendResult.messageId ?? null,
            },
          });
        } else if (campaign.channel === Channel.INSTAGRAM) {
          this.logger.log(
            `Sending Instagram DM campaign to ${recipient.name || recipient.phone}`,
          );
          const processedBody = this.processTextContent(
            campaign.body || '',
            recipient,
            apiBaseUrl,
          );
          const sendResult = await this.instagramService.sendInstagramDm(
            campaign.workspaceId,
            recipient.name || recipient.phone,
            processedBody,
          );
          await this.prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status: RecipientStatus.SENT,
              sentAt: new Date(),
              error: null,
              externalMessageId: sendResult.messageId,
            },
          });
        } else if (campaign.channel === Channel.SMS) {
          this.logger.log(`Sending SMS campaign to ${recipient.phone}`);
          const processedBody = this.processTextContent(
            campaign.body || '',
            recipient,
            apiBaseUrl,
          );
          const sendResult = await this.smsService.sendSms(
            campaign.workspaceId,
            recipient.phone,
            processedBody,
          );
          await this.prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status: RecipientStatus.SENT,
              sentAt: new Date(),
              error: null,
              externalMessageId: sendResult.messageId,
            },
          });
        } else if (campaign.channel === Channel.EMAIL) {
          const contact = await this.prisma.contact.findFirst({
            where: { workspaceId: campaign.workspaceId, phone: recipient.phone },
          });
          const toEmail = (contact?.metadata as any)?.email || `${recipient.phone}@demo.com`;

          this.logger.log(`Sending Email campaign to ${toEmail}`);
          const processedSubject = this.processTextContent(
            campaign.subject || 'Special Offer',
            recipient,
            apiBaseUrl,
          );
          const processedBody = this.processTextContent(
            campaign.body || '',
            recipient,
            apiBaseUrl,
          );
          const sendResult = await this.emailService.sendEmail(
            campaign.workspaceId,
            toEmail,
            processedSubject,
            processedBody,
          );
          await this.prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status: RecipientStatus.SENT,
              sentAt: new Date(),
              error: null,
              externalMessageId: sendResult.messageId,
            },
          });
        }

        sent++;
        await new Promise((r) => setTimeout(r, 1500));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Send failed';
        this.logger.error(`Failed ${recipient.phone}: ${message}`);
        await this.prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: { status: RecipientStatus.FAILED, error: message },
        });
        failed++;
      }
    }

    await this.prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: CampaignStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    return { sent, failed };
  }

  private processTextContent(text: string, recipient: { id: string; name: string | null; phone: string }, apiBaseUrl: string): string {
    let resolvedText = text;
    resolvedText = resolvedText.replace(/\{\{contact\.name\}\}/g, recipient.name || 'Customer');
    resolvedText = resolvedText.replace(/\{\{contact\.phone\}\}/g, recipient.phone);

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    resolvedText = resolvedText.replace(urlRegex, (url) => {
      return `${apiBaseUrl}/whatsapp/track/${recipient.id}?url=${encodeURIComponent(url)}`;
    });

    return resolvedText;
  }
}
