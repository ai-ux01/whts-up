import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SecretsCryptoService } from '../crypto/secrets-crypto.service';

const GRAPH = 'https://graph.facebook.com/v21.0';
const SCOPES = [
  'business_management',
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'whatsapp_business_management',
  'whatsapp_business_messaging',
].join(',');

@Injectable()
export class MetaOAuthService {
  private readonly logger = new Logger(MetaOAuthService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private secrets: SecretsCryptoService,
  ) {}

  isConfigured(): boolean {
    return !!(this.appId() && this.appSecret());
  }

  private appId() {
    return (
      this.config.get<string>('META_APP_ID')?.trim() ||
      this.config.get<string>('FACEBOOK_APP_ID')?.trim()
    );
  }

  private appSecret() {
    return this.config.get<string>('META_APP_SECRET')?.trim();
  }

  redirectUri(): string {
    return (
      this.config.get<string>('META_OAUTH_REDIRECT_URI')?.trim() ||
      `http://localhost:${this.config.get('PORT') || 4000}/api/v1/integrations/meta/callback`
    );
  }

  buildAuthorizeUrl(state: string): string {
    if (!this.isConfigured()) {
      const frontendUrl = this.config.get<string>('CORS_ORIGIN') || 'http://localhost:3000';
      const origin = frontendUrl.split(',')[0].trim();
      return `${origin}/mock/facebook-login?state=${state}&oauth=true`;
    }
    const params = new URLSearchParams({
      client_id: this.appId()!,
      redirect_uri: this.redirectUri(),
      state,
      scope: SCOPES,
      response_type: 'code',
    });
    return `https://www.facebook.com/v21.0/dialog/oauth?${params}`;
  }

  private async graphGet<T>(path: string, accessToken: string): Promise<T> {
    const url = path.startsWith('http')
      ? path
      : `${GRAPH}${path.startsWith('/') ? path : `/${path}`}`;
    const sep = url.includes('?') ? '&' : '?';
    const res = await fetch(`${url}${sep}access_token=${accessToken}`);
    if (!res.ok) {
      const err = await res.text();
      this.logger.warn(`Meta Graph ${path}: ${err}`);
      throw new BadRequestException('Meta API request failed');
    }
    return res.json() as Promise<T>;
  }

  async syncMockSocialAccounts(workspaceId: string) {
    this.logger.log(`Syncing mock social accounts for workspace ${workspaceId}...`);
    await this.prisma.socialAccount.upsert({
      where: {
        workspaceId_platform_accountId: {
          workspaceId,
          platform: 'FACEBOOK',
          accountId: 'avisoft_fb_page',
        },
      },
      update: {
        accountName: 'Avisoft Technologies (Facebook Page)',
        profilePicture: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
        accessToken: this.secrets.encryptIfNeeded('mock_facebook_page_token'),
      },
      create: {
        workspaceId,
        platform: 'FACEBOOK',
        accountId: 'avisoft_fb_page',
        accountName: 'Avisoft Technologies (Facebook Page)',
        profilePicture: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
        accessToken: this.secrets.encryptIfNeeded('mock_facebook_page_token'),
      },
    });

    await this.prisma.socialAccount.upsert({
      where: {
        workspaceId_platform_accountId: {
          workspaceId,
          platform: 'INSTAGRAM',
          accountId: 'avisoft_ig_id',
        },
      },
      update: {
        accountName: 'Avisoft Studios',
        profilePicture: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
        accessToken: this.secrets.encryptIfNeeded('mock_instagram_token'),
      },
      create: {
        workspaceId,
        platform: 'INSTAGRAM',
        accountId: 'avisoft_ig_id',
        accountName: 'Avisoft Studios',
        profilePicture: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
        accessToken: this.secrets.encryptIfNeeded('mock_instagram_token'),
      },
    });

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        metaPageId: 'avisoft_fb_page',
        instagramUsername: 'avisoft_studios',
      },
    });
    this.logger.log(`Successfully synced mock social accounts for workspace ${workspaceId}`);
  }

  async handleCallback(code: string, workspaceId: string) {
    let accessToken = 'mock_access_token';
    let expiresAt: Date | null = null;
    let assets: {
      adAccountId: string | null;
      pageId: string | null;
      phoneNumberId: string | null;
      businessId: string | null;
    } = {
      adAccountId: 'act_avisoft_ads',
      pageId: 'avisoft_page_id',
      phoneNumberId: 'whatsapp_avisoft_phone_id',
      businessId: 'avisoft_business_id',
    };

    if (code === 'mock_avisoft_code' || !this.isConfigured()) {
      this.logger.log(`Using mock Meta OAuth flow for code: ${code}`);
      expiresAt = new Date(Date.now() + 60 * 24 * 3600 * 1000); // 60 days
    } else {
      const tokenUrl = new URL(`${GRAPH}/oauth/access_token`);
      tokenUrl.searchParams.set('client_id', this.appId()!);
      tokenUrl.searchParams.set('client_secret', this.appSecret()!);
      tokenUrl.searchParams.set('redirect_uri', this.redirectUri());
      tokenUrl.searchParams.set('code', code);

      const shortRes = await fetch(tokenUrl);
      if (!shortRes.ok) {
        const err = await shortRes.text();
        this.logger.error(`Meta token exchange failed: ${err}`);
        throw new BadRequestException('Meta authorization failed');
      }
      const short = (await shortRes.json()) as {
        access_token: string;
        expires_in?: number;
      };

      const longUrl = new URL(`${GRAPH}/oauth/access_token`);
      longUrl.searchParams.set('grant_type', 'fb_exchange_token');
      longUrl.searchParams.set('client_id', this.appId()!);
      longUrl.searchParams.set('client_secret', this.appSecret()!);
      longUrl.searchParams.set('fb_exchange_token', short.access_token);

      const longRes = await fetch(longUrl);
      if (!longRes.ok) {
        const err = await longRes.text();
        this.logger.error(`Meta long-lived token failed: ${err}`);
        throw new BadRequestException('Meta long-lived token failed');
      }
      const long = (await longRes.json()) as {
        access_token: string;
        expires_in?: number;
      };

      accessToken = long.access_token;
      expiresAt = long.expires_in
        ? new Date(Date.now() + long.expires_in * 1000)
        : null;

      assets = await this.discoverAssets(accessToken);
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) throw new BadRequestException('Workspace not found');

    const syncWhatsApp =
      this.config.get<string>('META_OAUTH_SYNC_WHATSAPP') === 'true' || code === 'mock_avisoft_code';

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        metaOAuthToken: this.secrets.encryptIfNeeded(accessToken)!,
        metaOAuthExpiresAt: expiresAt,
        metaConnectedAt: new Date(),
        metaBusinessId: assets.businessId ?? workspace.metaBusinessId,
        metaAdsAccountId:
          assets.adAccountId ?? workspace.metaAdsAccountId,
        metaPageId: assets.pageId ?? workspace.metaPageId,
        ...(assets.phoneNumberId && !workspace.whatsappPhoneNumberId
          ? { whatsappPhoneNumberId: assets.phoneNumberId }
          : {}),
        ...(syncWhatsApp && assets.phoneNumberId
          ? {
              whatsappAccessToken: this.secrets.encryptIfNeeded(accessToken)!,
            }
          : {}),
      },
    });

    if (code === 'mock_avisoft_code' || !this.isConfigured()) {
      await this.syncMockSocialAccounts(workspaceId);
    } else {
      await this.syncSocialAccounts(workspaceId);
    }

    return {
      connected: true,
      adAccountId: assets.adAccountId,
      pageId: assets.pageId,
      phoneNumberId: assets.phoneNumberId,
      whatsappTokenSynced: syncWhatsApp && !!assets.phoneNumberId,
    };
  }

  private async discoverAssets(accessToken: string) {
    let adAccountId: string | null = null;
    let pageId: string | null = null;
    let phoneNumberId: string | null = null;
    let businessId: string | null = null;

    try {
      const ads = await this.graphGet<{
        data?: Array<{ account_id?: string; id?: string }>;
      }>('/me/adaccounts?fields=account_id,id,name&limit=5', accessToken);
      const first = ads.data?.[0];
      adAccountId = first?.account_id
        ? `act_${first.account_id.replace(/^act_/, '')}`
        : first?.id ?? null;
      if (adAccountId && !adAccountId.startsWith('act_')) {
        adAccountId = `act_${adAccountId}`;
      }
    } catch {
      /* optional */
    }

    try {
      const pages = await this.graphGet<{
        data?: Array<{ id: string }>;
      }>('/me/accounts?fields=id,name&limit=5', accessToken);
      pageId = pages.data?.[0]?.id ?? null;
    } catch {
      /* optional */
    }

    try {
      const businesses = await this.graphGet<{
        data?: Array<{ id: string }>;
      }>('/me/businesses?fields=id,name&limit=5', accessToken);
      businessId = businesses.data?.[0]?.id ?? null;

      for (const biz of businesses.data || []) {
        if (phoneNumberId) break;
        try {
          const wabas = await this.graphGet<{
            data?: Array<{ id: string }>;
          }>(
            `/${biz.id}/owned_whatsapp_business_accounts?fields=id&limit=3`,
            accessToken,
          );
          for (const waba of wabas.data || []) {
            const phones = await this.graphGet<{
              data?: Array<{ id: string }>;
            }>(
              `/${waba.id}/phone_numbers?fields=id,display_phone_number&limit=3`,
              accessToken,
            );
            if (phones.data?.[0]?.id) {
              phoneNumberId = phones.data[0].id;
              businessId = biz.id;
              break;
            }
          }
        } catch {
          /* continue */
        }
      }
    } catch {
      /* optional */
    }

    return { adAccountId, pageId, phoneNumberId, businessId };
  }

  async disconnect(workspaceId: string) {
    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        metaOAuthToken: null,
        metaOAuthExpiresAt: null,
        metaConnectedAt: null,
        metaBusinessId: null,
      },
    });
    return { disconnected: true };
  }

  async getStatus(workspaceId: string) {
    const w = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        metaConnectedAt: true,
        metaOAuthExpiresAt: true,
        metaAdsAccountId: true,
        metaPageId: true,
        metaBusinessId: true,
        metaOAuthToken: true,
      },
    });
    return {
      connected: !!w?.metaOAuthToken,
      connectedAt: w?.metaConnectedAt,
      expiresAt: w?.metaOAuthExpiresAt,
      adAccountId: w?.metaAdsAccountId,
      pageId: w?.metaPageId,
      businessId: w?.metaBusinessId,
    };
  }

  async syncSocialAccounts(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        metaOAuthToken: true,
        whatsappAccessToken: true,
        metaPageId: true,
        instagramUsername: true,
      },
    });
    if (!workspace) return;

    let token: string | null = null;
    try {
      token = this.secrets.decryptIfNeeded(workspace.metaOAuthToken) ||
              this.secrets.decryptIfNeeded(workspace.whatsappAccessToken);
    } catch (err) {
      this.logger.warn(`Failed to decrypt stored workspace tokens for sync: ${err.message}`);
    }

    if (!token) {
      token = this.config.get<string>('WHATSAPP_ACCESS_TOKEN')?.trim() || null;
    }

    if (!token) {
      this.logger.log(`No Meta access token found for workspace ${workspaceId}, skipping social accounts sync.`);
      return;
    }

    try {
      this.logger.log(`Syncing social accounts for workspace ${workspaceId}...`);

      const pagesData = await this.graphGet<{
        data?: Array<{
          id: string;
          name: string;
          access_token: string;
          picture?: { data?: { url?: string } };
        }>;
      }>('/me/accounts?fields=id,name,picture{url},access_token&limit=25', token);

      const pages = pagesData.data || [];
      if (pages.length === 0) {
        this.logger.log(`No Facebook pages found for token.`);
        return;
      }

      let updatedPageId = workspace.metaPageId;
      let updatedInstagramUsername = workspace.instagramUsername;

      for (const page of pages) {
        const fbProfilePicture = page.picture?.data?.url ?? null;
        
        await this.prisma.socialAccount.upsert({
          where: {
            workspaceId_platform_accountId: {
              workspaceId,
              platform: 'FACEBOOK',
              accountId: page.id,
            },
          },
          update: {
            accountName: page.name,
            profilePicture: fbProfilePicture,
            accessToken: this.secrets.encryptIfNeeded(page.access_token),
          },
          create: {
            workspaceId,
            platform: 'FACEBOOK',
            accountId: page.id,
            accountName: page.name,
            profilePicture: fbProfilePicture,
            accessToken: this.secrets.encryptIfNeeded(page.access_token),
          },
        });

        if (!updatedPageId) {
          updatedPageId = page.id;
        }

        try {
          const igData = await this.graphGet<{
            instagram_business_account?: {
              id: string;
              username: string;
              name?: string;
              profile_picture_url?: string;
            };
          }>(`/${page.id}?fields=instagram_business_account{id,username,name,profile_picture_url}`, token);

          const ig = igData.instagram_business_account;
          if (ig) {
            const igName = ig.name || ig.username;
            
            await this.prisma.socialAccount.upsert({
              where: {
                workspaceId_platform_accountId: {
                  workspaceId,
                  platform: 'INSTAGRAM',
                  accountId: ig.id,
                },
              },
              update: {
                accountName: igName,
                profilePicture: ig.profile_picture_url || null,
                accessToken: this.secrets.encryptIfNeeded(token),
              },
              create: {
                workspaceId,
                platform: 'INSTAGRAM',
                accountId: ig.id,
                accountName: igName,
                profilePicture: ig.profile_picture_url || null,
                accessToken: this.secrets.encryptIfNeeded(token),
              },
            });

            if (!updatedInstagramUsername) {
              updatedInstagramUsername = ig.username;
            }
          }
        } catch (igErr) {
          this.logger.warn(`Failed to fetch instagram account for page ${page.id}: ${igErr}`);
        }
      }

      if (
        updatedPageId !== workspace.metaPageId ||
        updatedInstagramUsername !== workspace.instagramUsername
      ) {
        await this.prisma.workspace.update({
          where: { id: workspaceId },
          data: {
            metaPageId: updatedPageId,
            instagramUsername: updatedInstagramUsername,
          },
        });
      }

      this.logger.log(`Successfully synced social accounts for workspace ${workspaceId}`);
    } catch (err) {
      this.logger.error(`Error syncing social accounts for workspace ${workspaceId}`, err);
    }
  }
}
