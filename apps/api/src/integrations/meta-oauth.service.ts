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
  'ads_read',
  'pages_show_list',
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
      throw new BadRequestException(
        'Set META_APP_ID and META_APP_SECRET in apps/api/.env',
      );
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

  async handleCallback(code: string, workspaceId: string) {
    if (!this.isConfigured()) {
      throw new BadRequestException('Meta OAuth not configured');
    }

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

    const accessToken = long.access_token;
    const expiresAt = long.expires_in
      ? new Date(Date.now() + long.expires_in * 1000)
      : null;

    const assets = await this.discoverAssets(accessToken);

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) throw new BadRequestException('Workspace not found');

    const syncWhatsApp =
      this.config.get<string>('META_OAUTH_SYNC_WHATSAPP') === 'true';

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
}
