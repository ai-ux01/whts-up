import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { normalizePhoneE164 } from '../common/utils/phone';
import { SecretsCryptoService } from '../crypto/secrets-crypto.service';
import { UpdateWorkspaceSettingsDto } from './dto/update-settings.dto';
import { Workspace } from '@prisma/client';

export interface MarketingAccountStatus {
  id: string;
  name: string;
  connected: boolean;
  configured: boolean;
  hint?: string;
}

@Injectable()
export class WorkspacesService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private secrets: SecretsCryptoService,
    @Inject(forwardRef(() => WhatsAppService))
    private whatsappService: WhatsAppService,
  ) {}

  private envWhatsApp() {
    return {
      phoneNumberId: this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID')?.trim(),
      accessToken: this.config.get<string>('WHATSAPP_ACCESS_TOKEN')?.trim(),
      verifyToken: this.config.get<string>('WHATSAPP_VERIFY_TOKEN')?.trim(),
      webhookBaseUrl: this.config.get<string>('PUBLIC_WEBHOOK_BASE_URL')?.trim(),
    };
  }

  private async syncEnvDefaults(workspace: Workspace): Promise<Workspace> {
    const env = this.envWhatsApp();
    const data: Partial<{
      whatsappPhoneNumberId: string;
      whatsappAccessToken: string;
      webhookVerifyToken: string;
    }> = {};

    if (
      env.phoneNumberId &&
      env.phoneNumberId !== workspace.whatsappPhoneNumberId
    ) {
      data.whatsappPhoneNumberId = env.phoneNumberId;
    }
    const dbToken = this.secrets.decryptIfNeeded(workspace.whatsappAccessToken);
    if (env.accessToken && env.accessToken !== dbToken) {
      data.whatsappAccessToken = this.secrets.encryptIfNeeded(env.accessToken)!;
    }
    if (
      env.verifyToken &&
      env.verifyToken !== workspace.webhookVerifyToken
    ) {
      data.webhookVerifyToken = env.verifyToken;
    }

    if (Object.keys(data).length === 0) return workspace;

    return this.prisma.workspace.update({
      where: { id: workspace.id },
      data,
    });
  }

  private buildMarketingAccounts(workspace: Workspace): MarketingAccountStatus[] {
    const waConnected = !!(
      workspace.whatsappPhoneNumberId && workspace.whatsappAccessToken
    );
    return [
      {
        id: 'whatsapp',
        name: 'WhatsApp Cloud API',
        connected: waConnected,
        configured: waConnected,
        hint: 'Inbox, AI replies, webhooks',
      },
      {
        id: 'meta_ads',
        name: 'Meta Ads',
        connected: !!(workspace.metaOAuthToken || workspace.metaAdsAccountId),
        configured: !!(workspace.metaOAuthToken || workspace.metaAdsAccountId),
        hint: workspace.metaOAuthToken
          ? 'OAuth connected'
          : 'Click-to-WhatsApp & ad attribution',
      },
      {
        id: 'meta_page',
        name: 'Facebook Page',
        connected: !!workspace.metaPageId,
        configured: !!workspace.metaPageId,
        hint: 'Page linked to WABA',
      },
      {
        id: 'google_ads',
        name: 'Google Ads',
        connected: !!(
          workspace.googleOAuthRefreshToken || workspace.googleAdsCustomerId
        ),
        configured: !!(
          workspace.googleOAuthRefreshToken || workspace.googleAdsCustomerId
        ),
        hint: workspace.googleOAuthRefreshToken
          ? 'OAuth connected'
          : 'UTM tracking on landing links',
      },
      {
        id: 'pixel',
        name: 'Meta Pixel',
        connected: !!workspace.facebookPixelId,
        configured: !!workspace.facebookPixelId,
        hint: 'Website + conversion tracking',
      },
      {
        id: 'instagram',
        name: 'Instagram',
        connected: !!workspace.instagramUsername,
        configured: !!workspace.instagramUsername,
        hint: '@username for brand',
      },
    ];
  }

  async getWhatsAppCredentials(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');

    const env = this.envWhatsApp();
    const phoneNumberId =
      env.phoneNumberId ?? workspace.whatsappPhoneNumberId ?? null;
    const accessToken =
      env.accessToken ??
      this.secrets.decryptIfNeeded(workspace.whatsappAccessToken) ??
      null;

    return {
      phoneNumberId,
      accessToken,
      tokenSource: env.accessToken
        ? 'env'
        : workspace.whatsappAccessToken
          ? 'database'
          : 'none',
    };
  }

  /** Re-encrypt legacy plain-text tokens when ENCRYPTION_KEY is set. */
  async migratePlainTokens(workspaceId: string) {
    if (!this.secrets.isEnabled()) return { migrated: false };
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace?.whatsappAccessToken) return { migrated: false };
    if (this.secrets.isEncrypted(workspace.whatsappAccessToken)) {
      return { migrated: false };
    }
    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        whatsappAccessToken: this.secrets.encrypt(workspace.whatsappAccessToken),
      },
    });
    return { migrated: true };
  }

  async syncFromEnv(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');
    const updated = await this.syncEnvDefaults(workspace);
    return this.toSettingsResponse(updated);
  }

  private toSettingsResponse(workspace: Workspace) {
    const env = this.envWhatsApp();
    const phoneNumberId =
      env.phoneNumberId ?? workspace.whatsappPhoneNumberId ?? null;
    const accessToken =
      env.accessToken ?? workspace.whatsappAccessToken ?? null;
    return {
      id: workspace.id,
      name: workspace.name,
      businessName: workspace.businessName,
      whatsappPhoneNumberId: phoneNumberId,
      whatsappConnected: !!(phoneNumberId && accessToken),
      webhookVerifyToken:
        env.verifyToken ?? workspace.webhookVerifyToken ?? null,
      webhookBaseUrl: env.webhookBaseUrl ?? null,
      whatsappTokenSource: env.accessToken
        ? 'env'
        : workspace.whatsappAccessToken
          ? 'database'
          : 'none',
      metaAdsAccountId: workspace.metaAdsAccountId,
      metaPageId: workspace.metaPageId,
      googleAdsCustomerId: workspace.googleAdsCustomerId,
      facebookPixelId: workspace.facebookPixelId,
      instagramUsername: workspace.instagramUsername,
      defaultUtmSource: workspace.defaultUtmSource,
      marketingAccounts: this.buildMarketingAccounts(workspace),
      aiEnabled: workspace.aiEnabled,
      aiSystemPrompt: workspace.aiSystemPrompt,
      secretsEncrypted: this.secrets.isEnabled(),
      metaOAuth: {
        connected: !!workspace.metaOAuthToken,
        connectedAt: workspace.metaConnectedAt,
        expiresAt: workspace.metaOAuthExpiresAt,
      },
      googleOAuth: {
        connected: !!(
          workspace.googleOAuthRefreshToken || workspace.googleConnectedAt
        ),
        connectedAt: workspace.googleConnectedAt,
        expiresAt: workspace.googleOAuthExpiresAt,
      },
    };
  }

  async getSettings(workspaceId: string) {
    let workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');

    workspace = await this.syncEnvDefaults(workspace);
    await this.migratePlainTokens(workspaceId);
    return this.toSettingsResponse(workspace);
  }

  async updateSettings(workspaceId: string, dto: UpdateWorkspaceSettingsDto) {
    const data: Parameters<typeof this.prisma.workspace.update>[0]['data'] = {};

    if (dto.whatsappPhoneNumberId !== undefined) {
      data.whatsappPhoneNumberId = dto.whatsappPhoneNumberId;
    }
    if (dto.whatsappAccessToken !== undefined && dto.whatsappAccessToken !== '') {
      data.whatsappAccessToken = this.secrets.encryptIfNeeded(
        dto.whatsappAccessToken,
      )!;
    }
    if (dto.webhookVerifyToken !== undefined) {
      data.webhookVerifyToken = dto.webhookVerifyToken;
    }
    if (dto.aiEnabled !== undefined) data.aiEnabled = dto.aiEnabled;
    if (dto.aiSystemPrompt !== undefined) data.aiSystemPrompt = dto.aiSystemPrompt;
    if (dto.businessName !== undefined) data.businessName = dto.businessName;
    if (dto.metaAdsAccountId !== undefined) {
      data.metaAdsAccountId = dto.metaAdsAccountId || null;
    }
    if (dto.metaPageId !== undefined) data.metaPageId = dto.metaPageId || null;
    if (dto.googleAdsCustomerId !== undefined) {
      data.googleAdsCustomerId = dto.googleAdsCustomerId || null;
    }
    if (dto.facebookPixelId !== undefined) {
      data.facebookPixelId = dto.facebookPixelId || null;
    }
    if (dto.instagramUsername !== undefined) {
      data.instagramUsername = dto.instagramUsername || null;
    }
    if (dto.defaultUtmSource !== undefined) {
      data.defaultUtmSource = dto.defaultUtmSource || null;
    }

    const workspace = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data,
    });

    return this.toSettingsResponse(workspace);
  }

  async findByPhoneNumberId(phoneNumberId: string) {
    return this.prisma.workspace.findFirst({
      where: { whatsappPhoneNumberId: phoneNumberId },
    });
  }

  async testWhatsApp(workspaceId: string, phone: string, message?: string) {
    const normalized = normalizePhoneE164(phone);
    if (!normalized) {
      throw new BadRequestException('Invalid phone number');
    }
    return this.whatsappService.sendTestMessage(
      workspaceId,
      normalized,
      message,
    );
  }

  async listMessageTemplates(workspaceId: string) {
    return this.whatsappService.listMessageTemplates(workspaceId);
  }
}
