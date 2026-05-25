import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SecretsCryptoService } from '../crypto/secrets-crypto.service';

const AUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ADS_API = 'https://googleads.googleapis.com/v18';
const SCOPE = 'https://www.googleapis.com/auth/adwords';

@Injectable()
export class GoogleOAuthService {
  private readonly logger = new Logger(GoogleOAuthService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private secrets: SecretsCryptoService,
  ) {}

  isConfigured(): boolean {
    return !!(this.clientId() && this.clientSecret());
  }

  private clientId() {
    return this.config.get<string>('GOOGLE_CLIENT_ID')?.trim();
  }

  private clientSecret() {
    return this.config.get<string>('GOOGLE_CLIENT_SECRET')?.trim();
  }

  private developerToken() {
    return this.config.get<string>('GOOGLE_ADS_DEVELOPER_TOKEN')?.trim();
  }

  redirectUri(): string {
    return (
      this.config.get<string>('GOOGLE_OAUTH_REDIRECT_URI')?.trim() ||
      `http://localhost:${this.config.get('PORT') || 4000}/api/v1/integrations/google/callback`
    );
  }

  buildAuthorizeUrl(state: string): string {
    if (!this.isConfigured()) {
      throw new BadRequestException(
        'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in apps/api/.env',
      );
    }
    const params = new URLSearchParams({
      client_id: this.clientId()!,
      redirect_uri: this.redirectUri(),
      response_type: 'code',
      scope: SCOPE,
      access_type: 'offline',
      prompt: 'consent',
      state,
    });
    return `${AUTH_BASE}?${params}`;
  }

  async handleCallback(code: string, workspaceId: string) {
    if (!this.isConfigured()) {
      throw new BadRequestException('Google OAuth not configured');
    }

    const body = new URLSearchParams({
      code,
      client_id: this.clientId()!,
      client_secret: this.clientSecret()!,
      redirect_uri: this.redirectUri(),
      grant_type: 'authorization_code',
    });

    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`Google token exchange failed: ${err}`);
      throw new BadRequestException('Google authorization failed');
    }

    const tokens = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

    let customerId: string | null = null;
    let customerListError: string | null = null;

    if (this.developerToken()) {
      try {
        customerId = await this.fetchFirstCustomerId(tokens.access_token);
      } catch (err) {
        customerListError =
          err instanceof Error ? err.message : 'Could not list Google Ads accounts';
        this.logger.warn(customerListError);
      }
    } else {
      customerListError =
        'Set GOOGLE_ADS_DEVELOPER_TOKEN to auto-fill customer ID';
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) throw new BadRequestException('Workspace not found');

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        googleOAuthAccessToken: this.secrets.encryptIfNeeded(
          tokens.access_token,
        )!,
        googleOAuthRefreshToken: tokens.refresh_token
          ? this.secrets.encryptIfNeeded(tokens.refresh_token)!
          : workspace.googleOAuthRefreshToken,
        googleOAuthExpiresAt: expiresAt,
        googleConnectedAt: new Date(),
        googleAdsCustomerId:
          customerId ?? workspace.googleAdsCustomerId,
      },
    });

    return {
      connected: true,
      customerId,
      customerListError,
    };
  }

  private formatCustomerId(resource: string): string {
    const id = resource.replace('customers/', '').replace(/-/g, '');
    if (id.length === 10) {
      return `${id.slice(0, 3)}-${id.slice(3, 6)}-${id.slice(6)}`;
    }
    return resource.replace('customers/', '');
  }

  private async fetchFirstCustomerId(accessToken: string): Promise<string | null> {
    const res = await fetch(
      `${ADS_API}/customers:listAccessibleCustomers`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'developer-token': this.developerToken()!,
        },
      },
    );
    if (!res.ok) {
      const err = await res.text();
      throw new BadRequestException(err || 'Google Ads API error');
    }
    const data = (await res.json()) as { resourceNames?: string[] };
    const first = data.resourceNames?.[0];
    if (!first) return null;
    return this.formatCustomerId(first);
  }

  async disconnect(workspaceId: string) {
    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        googleOAuthAccessToken: null,
        googleOAuthRefreshToken: null,
        googleOAuthExpiresAt: null,
        googleConnectedAt: null,
      },
    });
    return { disconnected: true };
  }

  async getStatus(workspaceId: string) {
    const w = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        googleConnectedAt: true,
        googleOAuthExpiresAt: true,
        googleAdsCustomerId: true,
        googleOAuthRefreshToken: true,
      },
    });
    return {
      connected: !!w?.googleOAuthRefreshToken || !!w?.googleConnectedAt,
      connectedAt: w?.googleConnectedAt,
      expiresAt: w?.googleOAuthExpiresAt,
      customerId: w?.googleAdsCustomerId,
      developerTokenConfigured: !!this.developerToken(),
    };
  }
}
