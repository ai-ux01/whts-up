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

  /**
   * Publish to Instagram via the two-step Graph API flow (create media
   * container → publish). A caption-only post is not allowed by the IG API —
   * an image_url is required, so callers must pass a real media URL.
   */
  private async publishToInstagram(
    igUserId: string,
    accessToken: string,
    caption: string,
    imageUrl?: string | null,
  ) {
    if (accessToken.startsWith('mock_') || accessToken === 'mock_access_token') {
      this.logger.log(`Skipping real Instagram post (mock account ${igUserId})`);
      return { id: 'mock_ig_post_id' };
    }
    if (!imageUrl) {
      throw new Error('Instagram post requires an image/media URL.');
    }

    // 1. Create media container.
    const containerRes = await fetch(
      `https://graph.facebook.com/v21.0/${igUserId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl, caption, access_token: accessToken }),
      },
    );
    const container = (await containerRes.json()) as { id?: string; error?: { message?: string } };
    if (!containerRes.ok || container.error) {
      throw new Error(`Instagram container error: ${container.error?.message || containerRes.statusText}`);
    }

    // 2. Publish the container.
    const publishRes = await fetch(
      `https://graph.facebook.com/v21.0/${igUserId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creation_id: container.id, access_token: accessToken }),
      },
    );
    const published = (await publishRes.json()) as { id?: string; error?: { message?: string } };
    if (!publishRes.ok || published.error) {
      throw new Error(`Instagram publish error: ${published.error?.message || publishRes.statusText}`);
    }
    return { id: published.id! };
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

          // Resolve a media URL for IG (required) from the matching SocialPost.
          const linkedPost = await this.prisma.socialPost.findFirst({
            where: {
              workspaceId: post.workspaceId,
              scheduledAt: post.scheduledAt,
              status: 'SCHEDULED',
            },
            select: { mediaUrl: true },
          });

          if (post.platform === 'FACEBOOK' || post.platform === 'BOTH') {
            try {
              const fbAccounts = await this.prisma.socialAccount.findMany({
                where: { workspaceId: post.workspaceId, platform: 'FACEBOOK' },
              });
              if (fbAccounts.length === 0) {
                this.logger.warn(`No connected Facebook account for workspace ${post.workspaceId}. Skipping FB publish.`);
              } else {
                for (const account of fbAccounts) {
                  const decryptedToken = this.secretsCrypto.decryptIfNeeded(account.accessToken);
                  if (decryptedToken) {
                    const res = await this.publishToFacebook(account.accountId, decryptedToken, post.content);
                    publishedPostId = res.id;
                  }
                }
              }
            } catch (err) {
              publishError = err instanceof Error ? err.message : String(err);
            }
          }

          if (!publishError && (post.platform === 'INSTAGRAM' || post.platform === 'BOTH')) {
            try {
              const igAccounts = await this.prisma.socialAccount.findMany({
                where: { workspaceId: post.workspaceId, platform: 'INSTAGRAM' },
              });
              if (igAccounts.length === 0) {
                this.logger.warn(`No connected Instagram account for workspace ${post.workspaceId}. Skipping IG publish.`);
              } else {
                for (const account of igAccounts) {
                  const decryptedToken = this.secretsCrypto.decryptIfNeeded(account.accessToken);
                  if (decryptedToken) {
                    const res = await this.publishToInstagram(
                      account.accountId,
                      decryptedToken,
                      post.content,
                      linkedPost?.mediaUrl,
                    );
                    publishedPostId = res.id;
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
