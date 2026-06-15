import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CampaignsService } from '../campaigns/campaigns.service';
import { QueueService } from '../queue/queue.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private campaignsService: CampaignsService,
    private queueService: QueueService,
    private prisma: PrismaService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async runCampaigns() {
    try {
      await this.campaignsService.processScheduledCampaigns();
    } catch (err) {
      this.logger.error('Campaign cron failed', err);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledPosts() {
    try {
      const now = new Date();
      const pendingPosts = await this.prisma.scheduledPost.findMany({
        where: {
          status: 'PENDING',
          scheduledAt: { lte: now },
        },
      });

      if (pendingPosts.length > 0) {
        this.logger.log(`Found ${pendingPosts.length} pending scheduled posts to process.`);
        for (const post of pendingPosts) {
          await this.prisma.scheduledPost.update({
            where: { id: post.id },
            data: { status: 'SENT' },
          });

          // Also update matching SocialPost record status to PUBLISHED
          await this.prisma.socialPost.updateMany({
            where: {
              workspaceId: post.workspaceId,
              scheduledAt: post.scheduledAt,
              status: 'SCHEDULED',
            },
            data: {
              status: 'PUBLISHED',
              publishedAt: now,
            },
          });

          this.logger.log(`Successfully published scheduled post: "${post.title}" to ${post.platform}`);
        }
      }
    } catch (err) {
      this.logger.error('Scheduled posts processing failed', err);
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
