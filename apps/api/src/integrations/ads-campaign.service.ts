import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SecretsCryptoService } from '../crypto/secrets-crypto.service';

const GRAPH = 'https://graph.facebook.com/v21.0';
const DEFAULT_MAX_DAILY_BUDGET = 5000; // INR — hard cap unless overridden by env

export interface CreateAdCampaignInput {
  name: string;
  objective?: string; // Meta objective, e.g. OUTCOME_LEADS
  dailyBudget: number; // in account currency major units (e.g. INR)
  confirm: boolean; // must be explicitly true — this spends money
}

/**
 * WRITE operations to the Meta Marketing API — creating ad campaigns.
 * SAFETY RAILS (live-money operation):
 *  - requires `confirm: true`
 *  - enforces a hard daily-budget cap (ADS_MAX_DAILY_BUDGET, default ₹5000)
 *  - creates the campaign in PAUSED status (nothing spends until you activate it in Meta)
 *  - refuses demo/mock ad accounts
 * Only ADMINs should reach this (enforced at the controller with RolesGuard).
 */
@Injectable()
export class AdsCampaignService {
  private readonly logger = new Logger(AdsCampaignService.name);

  constructor(
    private prisma: PrismaService,
    private secrets: SecretsCryptoService,
    private config: ConfigService,
  ) {}

  private maxDailyBudget(): number {
    const raw = Number(this.config.get<string>('ADS_MAX_DAILY_BUDGET'));
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MAX_DAILY_BUDGET;
  }

  async createCampaign(workspaceId: string, input: CreateAdCampaignInput) {
    if (!input.confirm) {
      throw new BadRequestException(
        'Ad campaign creation must be explicitly confirmed (confirm: true). This spends money.',
      );
    }

    const cap = this.maxDailyBudget();
    if (!input.dailyBudget || input.dailyBudget <= 0) {
      throw new BadRequestException('A positive dailyBudget is required.');
    }
    if (input.dailyBudget > cap) {
      throw new BadRequestException(
        `Daily budget ₹${input.dailyBudget} exceeds the safety cap of ₹${cap}. Lower it or raise ADS_MAX_DAILY_BUDGET.`,
      );
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { metaOAuthToken: true, metaAdsAccountId: true },
    });
    const token = this.decryptToken(workspace?.metaOAuthToken ?? null);
    const adAccountId = workspace?.metaAdsAccountId;

    if (!token || !adAccountId) {
      throw new BadRequestException('Connect a Meta ad account before creating campaigns.');
    }
    if (adAccountId.includes('avisoft') || token.startsWith('mock_')) {
      throw new ForbiddenException('Cannot create ads on a demo/mock ad account.');
    }

    // Create the campaign PAUSED. We intentionally do NOT create ad sets / ads /
    // creatives here (which would need targeting + a real creative + would go live) —
    // the campaign shell is created paused so a human finishes and activates it in Meta.
    const body = new URLSearchParams({
      name: input.name,
      objective: input.objective || 'OUTCOME_LEADS',
      status: 'PAUSED',
      special_ad_categories: '[]',
      daily_budget: String(Math.round(input.dailyBudget * 100)), // minor units
      access_token: token,
    });

    try {
      const res = await fetch(`${GRAPH}/${adAccountId}/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      const data = (await res.json()) as { id?: string; error?: { message?: string } };
      if (!res.ok || data.error) {
        throw new Error(data.error?.message || res.statusText);
      }
      this.logger.log(`Created PAUSED ad campaign ${data.id} for workspace ${workspaceId}`);
      return {
        success: true,
        campaignId: data.id,
        status: 'PAUSED',
        message:
          'Campaign created in PAUSED state. Add targeting, a creative, and activate it in Meta Ads Manager to start spending.',
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ad campaign creation failed';
      this.logger.error(`Ad campaign creation failed: ${message}`);
      throw new BadRequestException(`Meta ad campaign creation failed: ${message}`);
    }
  }

  private decryptToken(stored: string | null): string | null {
    if (!stored) return null;
    try {
      return this.secrets.decryptIfNeeded(stored);
    } catch {
      return null;
    }
  }
}
