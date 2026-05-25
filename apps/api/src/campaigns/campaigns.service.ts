import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CampaignStatus, RecipientStatus } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import { normalizePhoneE164 } from '../common/utils/phone';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { CreateCampaignDto } from './dto/campaign.dto';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private prisma: PrismaService,
    private whatsappService: WhatsAppService,
    private config: ConfigService,
    @Inject(forwardRef(() => QueueService))
    private queueService: QueueService,
  ) {}

  private mapCampaignList(
    campaigns: Array<{
      id: string;
      name: string;
      templateName: string;
      status: CampaignStatus;
      scheduledAt: Date | null;
      createdAt: Date;
      recipients: Array<{ status: RecipientStatus; error: string | null }>;
    }>,
  ) {
    return campaigns.map((c) => {
      const stats = { pending: 0, sent: 0, failed: 0 };
      for (const r of c.recipients) {
        if (r.status === RecipientStatus.PENDING) stats.pending++;
        else if (r.status === RecipientStatus.SENT) stats.sent++;
        else if (r.status === RecipientStatus.FAILED) stats.failed++;
      }
      const lastError = c.recipients.find((r) => r.error)?.error ?? null;
      return {
        id: c.id,
        name: c.name,
        templateName: c.templateName,
        status: c.status,
        scheduledAt: c.scheduledAt,
        createdAt: c.createdAt,
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
          select: { status: true, error: true },
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
        templateName: dto.templateName,
        templateParams: dto.templateParams || {},
        status: CampaignStatus.DRAFT,
      },
    });
  }

  async findOne(workspaceId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, workspaceId },
      include: {
        recipients: { orderBy: { createdAt: 'asc' } },
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
    const recipientCount = campaign.recipients.length;
    if (!recipientCount) {
      throw new BadRequestException('Upload CSV recipients before scheduling');
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
    await this.findOne(workspaceId, campaignId);

    await this.prisma.campaignRecipient.updateMany({
      where: {
        campaignId,
        status: { in: [RecipientStatus.FAILED, RecipientStatus.PENDING] },
      },
      data: { status: RecipientStatus.PENDING, error: null },
    });

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

    const params = (campaign.templateParams as Record<string, string>) || {};
    const languageCode =
      params._language ||
      this.config.get<string>('WHATSAPP_TEMPLATE_LANGUAGE') ||
      'en_US';

    let sent = 0;
    let failed = 0;

    for (const recipient of campaign.recipients) {
      try {
        this.logger.log(
          `Sending template "${campaign.templateName}" to ${recipient.phone}`,
        );
        const sendResult = await this.whatsappService.sendTemplateMessage(
          campaign.workspaceId,
          recipient.phone,
          campaign.templateName,
          params,
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

    return { sent, failed, templateName: campaign.templateName };
  }
}
