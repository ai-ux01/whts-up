import { Injectable, Logger } from '@nestjs/common';
import { LeadStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { AdsInsightsService } from '../integrations/ads-insights.service';

/**
 * Phase 5 — Intelligence.
 * Answers business questions from real data: acquisition (by source),
 * conversion funnel, economics (revenue from won leads), and content
 * performance. Only surfaces metrics the data actually supports — no
 * fabricated ad-spend/reach numbers.
 */
@Injectable()
export class IntelligenceService {
  private readonly logger = new Logger(IntelligenceService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private adsInsights: AdsInsightsService,
  ) {}

  async getAnalytics(workspaceId: string) {
    const adSpend = await this.adsInsights.getSpendSummary(workspaceId, 'this_month');
    const [leadsBySource, leadsByStatus, wonLeads, publishedPosts] = await Promise.all([
      this.prisma.contact.groupBy({
        by: ['leadSource'],
        where: { workspaceId, lead: { isNot: null } },
        _count: true,
      }),
      this.prisma.lead.groupBy({
        by: ['status'],
        where: { workspaceId },
        _count: true,
      }),
      this.prisma.lead.findMany({
        where: { workspaceId, status: LeadStatus.CLOSED },
        select: { value: true, wonAt: true },
      }),
      this.prisma.socialPost.findMany({
        where: { workspaceId, status: 'PUBLISHED' },
        select: { caption: true, platforms: true, insights: true },
      }),
    ]);

    // Acquisition
    const acquisition = leadsBySource
      .map((s) => ({ source: s.leadSource ?? 'unknown', leads: s._count }))
      .sort((a, b) => b.leads - a.leads);

    // Conversion funnel
    const statusMap = Object.fromEntries(
      leadsByStatus.map((s) => [s.status, s._count]),
    ) as Record<string, number>;
    const totalLeads = leadsByStatus.reduce((sum, s) => sum + s._count, 0);
    const conversion = {
      leads: totalLeads,
      interested: statusMap[LeadStatus.INTERESTED] ?? 0,
      followUp: statusMap[LeadStatus.FOLLOW_UP] ?? 0,
      customers: statusMap[LeadStatus.CLOSED] ?? 0,
    };

    // Economics. Revenue is real from won-lead values. Cost/lead & cost/customer
    // now come from the connected Meta ad account (read-only insights) when
    // available; otherwise they're omitted (0) with an explanatory note.
    const revenue = wonLeads.reduce((sum, l) => sum + (l.value ?? 0), 0);
    const customers = wonLeads.length;
    const adSpendValue = adSpend.connected ? adSpend.spend : 0;
    const economics = {
      revenue,
      customers,
      avgDealValue: customers ? Math.round(revenue / customers) : 0,
      conversionRate: totalLeads ? Math.round((customers / totalLeads) * 100) : 0,
      adSpend: adSpendValue,
      costPerLead: adSpend.connected && totalLeads ? Math.round(adSpendValue / totalLeads) : 0,
      costPerCustomer: adSpend.connected && customers ? Math.round(adSpendValue / customers) : 0,
      roas: adSpendValue > 0 ? Math.round((revenue / adSpendValue) * 100) / 100 : 0,
      adsConnected: adSpend.connected,
      note: adSpend.connected
        ? adSpend.note || 'Ad spend from connected Meta ad account (this month).'
        : 'Connect a Meta ad account to see ad spend, cost/lead, and ROAS.',
    };

    // Content performance (from real post insights, if any)
    const content = publishedPosts
      .map((p) => {
        const ins = (p.insights as Record<string, number> | null) || {};
        const engagement =
          Number(ins.engagements || ins.engagement || 0) +
          Number(ins.likes || 0) +
          Number(ins.views || ins.reelViews || 0);
        return {
          caption: (p.caption || '').slice(0, 60),
          platforms: p.platforms,
          engagement,
        };
      })
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 5);

    return {
      acquisition,
      conversion,
      economics,
      content,
      hasContentInsights: content.some((c) => c.engagement > 0),
    };
  }

  /**
   * AI interpretation of the analytics. Falls back to a rule-based summary
   * when AI is unavailable so the panel always shows something useful.
   */
  async interpret(workspaceId: string) {
    const analytics = await this.getAnalytics(workspaceId);
    const client = this.aiService.getClient();

    const topSource = analytics.acquisition[0];
    if (!client) {
      const parts: string[] = [];
      if (topSource) {
        parts.push(`${topSource.source} is your top lead source (${topSource.leads} leads).`);
      }
      if (analytics.economics.customers > 0) {
        parts.push(
          `You've closed ${analytics.economics.customers} customer(s) worth ₹${analytics.economics.revenue}.`,
        );
      }
      if (analytics.conversion.followUp > 0) {
        parts.push(`${analytics.conversion.followUp} lead(s) are awaiting follow-up — chase them to lift conversion.`);
      }
      return {
        interpretation:
          parts.join(' ') || 'Not enough data yet — capture more leads to unlock insights.',
        generatedByAi: false,
      };
    }

    try {
      const prompt = `You are a marketing analyst for an Indian SMB. Given this data, write 2-3 concise, actionable sentences (Hinglish ok) about what's working and what to do next. Data:
Acquisition: ${JSON.stringify(analytics.acquisition)}
Conversion: ${JSON.stringify(analytics.conversion)}
Economics: revenue ₹${analytics.economics.revenue}, customers ${analytics.economics.customers}.
Respond as JSON: { "interpretation": "..." }`;
      const completion = await client.chat.completions.create({
        model: this.aiService.getChatModel(),
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.6,
      });
      const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
      return {
        interpretation: String(parsed.interpretation || ''),
        generatedByAi: true,
      };
    } catch (err) {
      this.logger.error(`Analytics interpretation failed: ${(err as Error).message}`);
      return {
        interpretation: topSource
          ? `${topSource.source} is your top lead source. Keep investing there.`
          : 'Not enough data yet.',
        generatedByAi: false,
      };
    }
  }
}
