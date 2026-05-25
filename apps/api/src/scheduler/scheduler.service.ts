import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CampaignsService } from '../campaigns/campaigns.service';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private campaignsService: CampaignsService,
    private queueService: QueueService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async runCampaigns() {
    try {
      await this.campaignsService.processScheduledCampaigns();
    } catch (err) {
      this.logger.error('Campaign cron failed', err);
    }
  }

  @Cron('*/15 * * * *')
  async runAutomations() {
    try {
      await this.queueService.enqueueAutomationScan();
    } catch (err) {
      this.logger.error('Automation cron failed', err);
    }
  }
}
