import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SecretsCryptoService } from '../crypto/secrets-crypto.service';

const GRAPH = 'https://graph.facebook.com/v21.0';

export interface AdSpendSummary {
  connected: boolean;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  cpc: number; // cost per click
  cpl: number; // cost per lead (from ad-reported leads)
  currency: string;
  datePreset: string;
  note?: string;
}

/**
 * READ-ONLY Meta Ads insights. Fetches spend/impressions/clicks/leads from the
 * Marketing API for the workspace's connected ad account. Never creates or
 * modifies ads or spends money — purely reporting to power CPL/CPA analytics.
 */
@Injectable()
export class AdsInsightsService {
  private readonly logger = new Logger(AdsInsightsService.name);

  constructor(
    private prisma: PrismaService,
    private secrets: SecretsCryptoService,
    private config: ConfigService,
  ) {}

  /**
   * @param datePreset Meta date preset: 'today' | 'this_month' | 'last_30d' | ...
   */
  async getSpendSummary(
    workspaceId: string,
    datePreset = 'this_month',
  ): Promise<AdSpendSummary> {
    const empty: AdSpendSummary = {
      connected: false,
      spend: 0,
      impressions: 0,
      clicks: 0,
      leads: 0,
      cpc: 0,
      cpl: 0,
      currency: 'INR',
      datePreset,
    };

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { metaOAuthToken: true, metaAdsAccountId: true },
    });

    const token = this.decryptToken(workspace?.metaOAuthToken ?? null);
    const adAccountId = workspace?.metaAdsAccountId;

    if (!token || !adAccountId) {
      return { ...empty, note: 'Connect a Meta ad account to see ad spend and cost-per-lead.' };
    }

    // Mock/demo accounts (from the non-prod OAuth flow) have no real insights.
    if (adAccountId.includes('avisoft') || token.startsWith('mock_')) {
      return { ...empty, connected: true, note: 'Connected ad account is a demo — no live spend.' };
    }

    try {
      const fields = 'spend,impressions,clicks,cpc,actions';
      const url =
        `${GRAPH}/${adAccountId}/insights?fields=${fields}` +
        `&date_preset=${encodeURIComponent(datePreset)}&access_token=${encodeURIComponent(token)}`;
      const res = await fetch(url);
      const data = (await res.json()) as {
        error?: { message?: string };
        data?: Array<{
          spend?: string;
          impressions?: string;
          clicks?: string;
          cpc?: string;
          actions?: Array<{ action_type: string; value: string }>;
        }>;
      };
      if (!res.ok || data.error) {
        throw new Error(data.error?.message || res.statusText);
      }

      const row = data.data?.[0];
      if (!row) {
        return { ...empty, connected: true, note: 'No ad activity in this period.' };
      }

      const spend = Number(row.spend || 0);
      const impressions = Number(row.impressions || 0);
      const clicks = Number(row.clicks || 0);
      const cpc = Number(row.cpc || 0);
      // "leads" from ad actions (lead form / messaging conversions).
      const leadActions =
        row.actions?.filter((a) =>
          /lead|onsite_conversion\.messaging_first_reply|link_click/.test(a.action_type),
        ) || [];
      const leads = leadActions
        .filter((a) => a.action_type.includes('lead'))
        .reduce((sum, a) => sum + Number(a.value || 0), 0);

      return {
        connected: true,
        spend: Math.round(spend),
        impressions,
        clicks,
        leads,
        cpc: Math.round(cpc * 100) / 100,
        cpl: leads > 0 ? Math.round(spend / leads) : 0,
        currency: 'INR',
        datePreset,
      };
    } catch (err) {
      this.logger.error(`Ads insights fetch failed: ${(err as Error).message}`);
      return { ...empty, connected: true, note: 'Could not fetch ad insights right now.' };
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
