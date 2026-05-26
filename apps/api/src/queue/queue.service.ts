import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import { AutomationService } from '../automation/automation.service';
import { CampaignsService } from '../campaigns/campaigns.service';
import {
  AUTOMATION_JOB_SCAN,
  AUTOMATION_QUEUE,
  CAMPAIGN_JOB_SEND,
  CAMPAIGN_QUEUE,
} from './queue.constants';
import { normalizeRedisUrl } from './redis-url';

export type QueueMode = 'redis' | 'inline';

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private connection: IORedis | null = null;
  private campaignQueue: Queue | null = null;
  private automationQueue: Queue | null = null;
  private campaignWorker: Worker | null = null;
  private automationWorker: Worker | null = null;
  private mode: QueueMode = 'inline';

  constructor(
    private config: ConfigService,
    private moduleRef: ModuleRef,
  ) {}

  getMode(): QueueMode {
    return this.mode;
  }

  async onModuleInit() {
    const raw = this.config.get<string>('REDIS_URL')?.trim();
    if (!raw) {
      this.logger.warn(
        'REDIS_URL not set — campaigns/automations run inline (no job queue)',
      );
      return;
    }

    const url = normalizeRedisUrl(raw);
    if (url !== raw) {
      this.logger.warn(
        'REDIS_URL contained extra text; using normalized URL (paste only rediss://... from Upstash)',
      );
    }

    try {
      this.connection = new IORedis(url, { maxRetriesPerRequest: null });
      this.connection.on('error', (err) => {
        this.logger.warn(`Redis: ${err.message}`);
      });
      await this.connection.ping();
      this.mode = 'redis';

      this.campaignQueue = new Queue(CAMPAIGN_QUEUE, {
        connection: this.connection,
      });
      this.automationQueue = new Queue(AUTOMATION_QUEUE, {
        connection: this.connection,
      });

      this.campaignWorker = new Worker(
        CAMPAIGN_QUEUE,
        async (job: Job<{ campaignId: string }>) => {
          const campaigns = this.moduleRef.get(CampaignsService, {
            strict: false,
          });
          return campaigns.runCampaign(job.data.campaignId);
        },
        {
          connection: this.connection,
          concurrency: 1,
        },
      );

      this.automationWorker = new Worker(
        AUTOMATION_QUEUE,
        async () => {
          const automation = this.moduleRef.get(AutomationService, {
            strict: false,
          });
          return automation.processNoReplyRules();
        },
        { connection: this.connection, concurrency: 1 },
      );

      this.campaignWorker.on('failed', (job, err) => {
        this.logger.error(`Campaign job ${job?.id} failed`, err);
      });

      this.logger.log(`Job queues active (${url})`);
    } catch (err) {
      this.logger.error(
        'Redis unavailable — falling back to inline processing',
        err,
      );
      await this.teardown();
    }
  }

  async onModuleDestroy() {
    await this.teardown();
  }

  private async teardown() {
    await this.campaignWorker?.close();
    await this.automationWorker?.close();
    await this.campaignQueue?.close();
    await this.automationQueue?.close();
    this.connection?.disconnect();
    this.campaignWorker = null;
    this.automationWorker = null;
    this.campaignQueue = null;
    this.automationQueue = null;
    this.connection = null;
    this.mode = 'inline';
  }

  async pingRedis(): Promise<boolean> {
    if (!this.connection) return false;
    try {
      await this.connection.ping();
      return true;
    } catch {
      return false;
    }
  }

  async enqueueCampaign(campaignId: string, dedupeJob = true) {
    if (this.campaignQueue) {
      const jobId = dedupeJob
        ? `campaign-${campaignId}`
        : `campaign-${campaignId}-${Date.now()}`;
      const job = await this.campaignQueue.add(
        CAMPAIGN_JOB_SEND,
        { campaignId },
        {
          jobId,
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      );
      return {
        mode: 'redis' as const,
        queued: true,
        jobId: job.id,
      };
    }

    const campaigns = this.moduleRef.get(CampaignsService, { strict: false });
    const result = await campaigns.runCampaign(campaignId);
    return { mode: 'inline' as const, queued: false, ...result };
  }

  async enqueueAutomationScan() {
    if (this.automationQueue) {
      const job = await this.automationQueue.add(
        AUTOMATION_JOB_SCAN,
        {},
        {
          jobId: `automation-scan-${Math.floor(Date.now() / (15 * 60 * 1000))}`,
          removeOnComplete: true,
          removeOnFail: 20,
          attempts: 2,
        },
      );
      return { mode: 'redis' as const, jobId: job.id };
    }

    const automation = this.moduleRef.get(AutomationService, { strict: false });
    await automation.processNoReplyRules();
    return { mode: 'inline' as const };
  }

  async getCampaignJobState(campaignId: string) {
    if (!this.campaignQueue) return null;
    const job = await this.campaignQueue.getJob(`campaign-${campaignId}`);
    if (!job) return null;
    const state = await job.getState();
    return {
      jobId: job.id,
      state,
      progress: job.progress,
      failedReason: job.failedReason,
    };
  }
}
