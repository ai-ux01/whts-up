import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class InsightsService {
  private readonly logger = new Logger(InsightsService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

  /**
   * Compiles the AI Market Gap Analysis.
   * Scans competitor reviews for patterns where ratings are low and aggregates complaint categories.
   */
  async getMarketGaps(workspaceId: string) {
    this.logger.log(`Fetching market gaps for workspace ${workspaceId}...`);

    // Fetch existing compiled market insights first
    const existingInsights = await this.prisma.marketInsight.findMany({
      where: { workspaceId, category: 'MARKET_GAP' },
      orderBy: { createdAt: 'desc' },
    });

    if (existingInsights.length > 0) {
      return existingInsights;
    }

    // If none exist, let's trigger an initial compilation
    return this.generateMarketGaps(workspaceId);
  }

  /**
   * Generates or regenerates market gaps using OpenAI or highly-tailored local heuristics.
   */
  async generateMarketGaps(workspaceId: string) {
    this.logger.log(`Compiling fresh market gaps for workspace ${workspaceId}...`);

    const competitors = await this.prisma.competitor.findMany({
      where: { workspaceId },
      include: { reviews: true },
    });

    if (competitors.length === 0) {
      return [];
    }

    const client = this.aiService.getClient();
    const model = this.aiService.getChatModel();

    // Prepare competitors review dumps for OpenAI analysis
    const reviewsDump = competitors
      .flatMap((c) =>
        c.reviews
          .filter((r) => r.rating <= 3 && r.reviewText)
          .map((r) => `[Competitor: ${c.name}, Rating: ${r.rating}, Complaint: "${r.complaintCategory || 'Unknown'}", Comment: "${r.reviewText}"]`)
      )
      .slice(0, 40)
      .join('\n');

    // No AI, or no negative reviews to feed AI → derive gaps from the real
    // competitor complaint data instead of fabricating or returning nothing.
    if (!client || !reviewsDump) {
      return this.saveDerivedMarketGaps(workspaceId, competitors);
    }

    try {
      const prompt = `You are an elite business analyst researching local business competitors in India.
Here is a list of negative reviews (1-3 stars) from our direct competitors:
${reviewsDump}

Identify the top 3 critical "Market Gaps" or "Competitor Weaknesses".
- Highlight exactly what competitors are failing at (e.g., pricing confusion, bad customer support, slow service, lack of digital booking).
- Explain how our business can exploit these gaps to win customers.
- Maintain a highly professional, encouraging SaaS product tone, and use Hinglish expressions where appropriate.

You must respond in strict, valid JSON format matching this schema:
{
  "gaps": [
    {
      "title": "Short title of the gap (e.g. WhatsApp Instant Booking Opportunity)",
      "description": "Detailed explanation of competitor failure and how our business can capitalize on it."
    }
  ]
}`;

      const completion = await client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.6,
      });

      const responseText = completion.choices[0]?.message?.content?.trim();
      if (responseText) {
        const parsed = JSON.parse(responseText);
        const gaps = parsed.gaps || [];

        await this.prisma.marketInsight.deleteMany({
          where: { workspaceId, category: 'MARKET_GAP' },
        });

        const saved = [];
        for (const gap of gaps) {
          const item = await this.prisma.marketInsight.create({
            data: {
              workspaceId,
              title: gap.title,
              description: gap.description,
              category: 'MARKET_GAP',
            },
          });
          saved.push(item);
        }
        return saved;
      }
    } catch (err) {
      this.logger.error('Error generating AI Market Gaps:', err);
    }

    // AI failed (e.g. quota/rate limit) — fall back to real data-derived gaps.
    return this.saveDerivedMarketGaps(workspaceId, competitors);
  }

  /**
   * Rule-based market gaps computed from REAL tracked-competitor reviews.
   * Aggregates each competitor's most common complaint categories and turns the
   * biggest ones into gap cards. Never fabricates competitor names or numbers.
   */
  private async saveDerivedMarketGaps(
    workspaceId: string,
    competitors: Array<{ name: string; averageRating: number; reviews: Array<{ rating: number; complaintCategory: string | null }> }>,
  ) {
    // Tally complaint categories across all competitors (from real ≤3★ reviews).
    const tally = new Map<string, { count: number; competitors: Set<string> }>();
    for (const c of competitors) {
      for (const r of c.reviews) {
        if (r.rating <= 3 && r.complaintCategory) {
          const entry = tally.get(r.complaintCategory) || { count: 0, competitors: new Set<string>() };
          entry.count += 1;
          entry.competitors.add(c.name);
          tally.set(r.complaintCategory, entry);
        }
      }
    }

    const ranked = [...tally.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 3);
    if (ranked.length === 0) {
      // No complaint data to derive from — return whatever already exists (may be empty).
      return this.prisma.marketInsight.findMany({
        where: { workspaceId, category: 'MARKET_GAP' },
        orderBy: { createdAt: 'desc' },
      });
    }

    await this.prisma.marketInsight.deleteMany({
      where: { workspaceId, category: 'MARKET_GAP' },
    });

    const saved = [];
    for (const [category, info] of ranked) {
      const names = [...info.competitors].slice(0, 3).join(', ');
      saved.push(
        await this.prisma.marketInsight.create({
          data: {
            workspaceId,
            title: `${category} weakness`,
            description: `Competitors (${names}) received ${info.count} negative review(s) about "${category}". Win these customers by making "${category}" a visible strength — highlight it in your offers and WhatsApp messaging.`,
            category: 'MARKET_GAP',
          },
        }),
      );
    }
    this.logger.log(`Compiled ${saved.length} rule-based market gaps (AI unavailable).`);
    return saved;
  }

  /**
   * Generates a comparative SWOT Matrix between our own business and competitors.
   */
  async generateSwot(workspaceId: string) {
    this.logger.log(`Compiling SWOT Analysis for workspace ${workspaceId}...`);

    // 1. Fetch own reviews
    const [ownFeedbacks, ownReviews] = await Promise.all([
      this.prisma.feedback.findMany({ where: { workspaceId }, take: 20 }),
      this.prisma.googleReview.findMany({ where: { workspaceId }, take: 20 }),
    ]);

    // 2. Fetch competitor reviews
    const competitors = await this.prisma.competitor.findMany({
      where: { workspaceId },
      include: { reviews: { take: 20 } },
    });

    const client = this.aiService.getClient();
    const model = this.aiService.getChatModel();

    // No AI configured → derive a SWOT from the real own/competitor review data.
    if (!client) {
      return this.deriveSwot(ownFeedbacks, ownReviews, competitors);
    }

    try {
      const ownDump = [
        ...ownFeedbacks.map((f) => `[Rating: ${f.rating}, feedback: "${f.feedback || 'None'}"]`),
        ...ownReviews.map((r) => `[Rating: ${r.rating}, review: "${r.reviewText || 'None'}"]`),
      ].join('\n');

      const competitorsDump = competitors
        .flatMap((c) =>
          c.reviews.map((r) => `[Competitor: ${c.name}, Rating: ${r.rating}, review: "${r.reviewText || 'None'}"]`)
        )
        .slice(0, 30)
        .join('\n');

      const prompt = `You are a world-class business intelligence consultant.
Analyze our business reviews and competitor reviews to produce a comprehensive SWOT (Strengths, Weaknesses, Opportunities, Threats) matrix.

Our Business Reviews/Feedback:
${ownDump || 'No reviews loaded yet.'}

Competitor Reviews:
${competitorsDump || 'No competitor reviews loaded yet.'}

Generate exactly 3 points for Strengths, 3 for Weaknesses, 3 for Opportunities, and 3 for Threats.
- Ensure the SWOT points are highly actionable, specific to the data provided, and extremely helpful for an Indian SMB owner.
- Sound highly strategic, clear, and professional.

You must respond in strict, valid JSON format matching this schema:
{
  "strengths": ["point 1", "point 2", "point 3"],
  "weaknesses": ["point 1", "point 2", "point 3"],
  "opportunities": ["point 1", "point 2", "point 3"],
  "threats": ["point 1", "point 2", "point 3"]
}`;

      const completion = await client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.6,
      });

      const responseText = completion.choices[0]?.message?.content?.trim();
      if (responseText) {
        return JSON.parse(responseText);
      }
    } catch (err) {
      this.logger.error('Error compiling AI SWOT Matrix:', err);
    }

    // AI failed — derive from real data rather than returning generic filler.
    return this.deriveSwot(ownFeedbacks, ownReviews, competitors);
  }

  /**
   * Rule-based SWOT computed from REAL own reviews/feedback vs competitor reviews.
   * Honest empty-ish output when there is no data, never fabricated competitor names.
   */
  private deriveSwot(
    ownFeedbacks: Array<{ rating: number }>,
    ownReviews: Array<{ rating: number }>,
    competitors: Array<{ name: string; averageRating: number; reviews: Array<{ rating: number; complaintCategory: string | null; praiseCategory: string | null }> }>,
  ) {
    const ownRatings = [...ownFeedbacks.map((f) => f.rating), ...ownReviews.map((r) => r.rating)];
    const ownTotal = ownRatings.length;
    const ownAvg = ownTotal ? ownRatings.reduce((s, r) => s + r, 0) / ownTotal : 0;

    const compReviews = competitors.flatMap((c) => c.reviews);
    const compAvg = compReviews.length
      ? compReviews.reduce((s, r) => s + r.rating, 0) / compReviews.length
      : competitors.length
        ? competitors.reduce((s, c) => s + c.averageRating, 0) / competitors.length
        : 0;

    // Competitor complaint themes = our opportunities; their praise themes = threats.
    const complaintTally = new Map<string, number>();
    const praiseTally = new Map<string, number>();
    for (const r of compReviews) {
      if (r.rating <= 3 && r.complaintCategory) complaintTally.set(r.complaintCategory, (complaintTally.get(r.complaintCategory) || 0) + 1);
      if (r.rating >= 4 && r.praiseCategory) praiseTally.set(r.praiseCategory, (praiseTally.get(r.praiseCategory) || 0) + 1);
    }
    const topComplaints = [...complaintTally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    const topPraise = [...praiseTally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const opportunities: string[] = [];
    const threats: string[] = [];

    if (ownTotal > 0) {
      strengths.push(`Your average rating is ${ownAvg.toFixed(1)}★ across ${ownTotal} review(s)/feedback.`);
      if (compAvg && ownAvg >= compAvg) strengths.push(`You rate at or above the tracked-competitor average (${compAvg.toFixed(1)}★).`);
      if (compAvg && ownAvg < compAvg) weaknesses.push(`Your rating (${ownAvg.toFixed(1)}★) trails the competitor average (${compAvg.toFixed(1)}★).`);
    } else {
      weaknesses.push('No own reviews/feedback collected yet — start collecting via the Reputation tab.');
      opportunities.push('Send WhatsApp feedback requests to build a public rating base.');
    }

    for (const [cat, n] of topComplaints) {
      opportunities.push(`Competitors get ${n} complaint(s) about "${cat}" — make it your visible strength.`);
    }
    for (const [cat, n] of topPraise) {
      threats.push(`Competitors are praised for "${cat}" (${n} mention(s)) — match or exceed it.`);
    }
    if (competitors.length === 0) {
      threats.push('No competitors tracked yet — track some to surface real competitive threats.');
    }

    return {
      strengths: strengths.length ? strengths : ['Not enough data yet to identify strengths.'],
      weaknesses: weaknesses.length ? weaknesses : ['Not enough data yet to identify weaknesses.'],
      opportunities: opportunities.length ? opportunities : ['Track competitors and collect reviews to surface opportunities.'],
      threats: threats.length ? threats : ['Track competitors to surface competitive threats.'],
    };
  }
}
