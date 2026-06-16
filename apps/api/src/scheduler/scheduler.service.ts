import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CampaignsService } from '../campaigns/campaigns.service';
import { QueueService } from '../queue/queue.service';
import { PrismaService } from '../prisma/prisma.service';
import { SecretsCryptoService } from '../crypto/secrets-crypto.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private campaignsService: CampaignsService,
    private queueService: QueueService,
    private prisma: PrismaService,
    private secretsCrypto: SecretsCryptoService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async runCampaigns() {
    try {
      await this.campaignsService.processScheduledCampaigns();
    } catch (err) {
      this.logger.error('Campaign cron failed', err);
    }
  }

  private async publishToFacebook(pageAccountId: string, pageAccessToken: string, message: string) {
    if (pageAccessToken.startsWith('mock_') || pageAccessToken === 'mock_access_token') {
      this.logger.log(`Skipping real Facebook API post (Mock account page: ${pageAccountId})`);
      return { id: 'mock_fb_post_id' };
    }

    const url = `https://graph.facebook.com/v21.0/${pageAccountId}/feed`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        access_token: pageAccessToken,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Facebook API publish failed for page ${pageAccountId}: ${errorText}`);
      throw new Error(`Facebook API error: ${errorText}`);
    }

    const result = (await response.json()) as { id: string };
    return result;
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
          let publishError: string | null = null;
          let publishedPostId: string | null = null;

          if (post.platform === 'FACEBOOK' || post.platform === 'BOTH') {
            try {
              // Retrieve connected Facebook accounts
              const fbAccounts = await this.prisma.socialAccount.findMany({
                where: {
                  workspaceId: post.workspaceId,
                  platform: 'FACEBOOK',
                },
              });

              if (fbAccounts.length === 0) {
                this.logger.warn(`No connected Facebook social account found for workspace ${post.workspaceId}. Skipping real publish.`);
              } else {
                for (const account of fbAccounts) {
                  if (account.accessToken) {
                    const decryptedToken = this.secretsCrypto.decryptIfNeeded(account.accessToken);
                    if (decryptedToken) {
                      const res = await this.publishToFacebook(account.accountId, decryptedToken, post.content);
                      publishedPostId = res.id;
                    }
                  }
                }
              }
            } catch (err) {
              publishError = err instanceof Error ? err.message : String(err);
            }
          }

          const status = publishError ? 'FAILED' : 'SENT';

          await this.prisma.scheduledPost.update({
            where: { id: post.id },
            data: { status },
          });

          // Also update matching SocialPost record status
          await this.prisma.socialPost.updateMany({
            where: {
              workspaceId: post.workspaceId,
              scheduledAt: post.scheduledAt,
              status: 'SCHEDULED',
            },
            data: {
              status: publishError ? 'FAILED' : 'PUBLISHED',
              publishedAt: publishError ? null : now,
              error: publishError,
              postId: publishedPostId,
            },
          });

          if (publishError) {
            this.logger.error(`Failed to publish scheduled post: "${post.title}". Error: ${publishError}`);
          } else {
            this.logger.log(`Successfully published scheduled post: "${post.title}" to ${post.platform}`);
          }
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
