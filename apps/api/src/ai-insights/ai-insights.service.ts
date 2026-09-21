import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class AIInsightsService {
  private readonly logger = new Logger(AIInsightsService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

  async listInsights(workspaceId: string) {
    return this.prisma.reputationInsight.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async generateInsights(workspaceId: string) {
    this.logger.log(`Scanning data to compile fresh AI insights for workspace ${workspaceId}...`);

    // Fetch feedbacks and reviews
    const [feedbacks, googleReviews] = await Promise.all([
      this.prisma.feedback.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      this.prisma.googleReview.findMany({
        where: { workspaceId },
        orderBy: { reviewDate: 'desc' },
        take: 30,
      }),
    ]);

    const totalCount = feedbacks.length + googleReviews.length;
    if (totalCount === 0) {
      return [];
    }

    const client = this.aiService.getClient();
    const model = this.aiService.getChatModel();

    if (!client) {
      return this.saveDerivedInsights(workspaceId, feedbacks, googleReviews);
    }

    try {
      // Prepare feedback digests for OpenAI context
      const feedbackDump = feedbacks.map((f) => `[Rating: ${f.rating}, Comment: "${f.feedback || 'None'}", Category: "${f.complaintCategory || 'None'}"]`).join('\n');
      const reviewDump = googleReviews.map((g) => `[Rating: ${g.rating}, Comment: "${g.reviewText || 'None'}", Sentiment: "${g.sentiment || 'None'}"]`).join('\n');

      const prompt = `You are a high-level SaaS business consultant analyzing reputation data for an Indian business.
We have collected some private WhatsApp feedback and public Google reviews.

Recent Customer Feedbacks:
${feedbackDump}

Recent Google Reviews:
${reviewDump}

Evaluate these entries to generate exactly 3 highly specific, professional, and actionable business insights.
- Categorize each insight as: "CSAT_OVERVIEW", "POSITIVE_HIGHLIGHT", or "COMPLAINT_TREND".
- Ensure the insights sound native, address actual points mentioned in the comments (like staff names, delay issues, or product quality), and suggest clear, actionable remedies.
- Use Hinglish phrases naturally where relevant to match the local SMB context.

You must respond in strict, valid JSON format matching this schema:
{
  "insights": [
    {
      "insight": "Insight description and recommendation text goes here...",
      "category": "CSAT_OVERVIEW" | "POSITIVE_HIGHLIGHT" | "COMPLAINT_TREND"
    }
  ]
}`;

      const completion = await client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.5,
      });

      const responseText = completion.choices[0]?.message?.content?.trim();
      if (responseText) {
        const result = JSON.parse(responseText);
        const list = result.insights || [];

        // Clear outdated insights so we only display fresh compiled recommendations
        await this.prisma.reputationInsight.deleteMany({
          where: { workspaceId },
        });

        const saved = [];
        for (const item of list) {
          const ins = await this.prisma.reputationInsight.create({
            data: {
              workspaceId,
              insight: item.insight,
              category: item.category || 'CSAT_OVERVIEW',
            },
          });
          saved.push(ins);
        }

        this.logger.log(`Successfully generated ${saved.length} AI business insights.`);
        return saved;
      }
    } catch (err) {
      this.logger.error('Error generating AI business insights:', err);
    }

    // AI call failed (e.g. quota/rate limit/network) — fall back to rule-based
    // insights computed from the real data instead of returning nothing.
    return this.saveDerivedInsights(workspaceId, feedbacks, googleReviews);
  }

  /**
   * Compute honest, rule-based insights from real ratings/sentiment when the AI
   * provider is unavailable. Numbers here are derived from the actual data — not
   * hardcoded — so the feature still produces a real result.
   */
  private async saveDerivedInsights(
    workspaceId: string,
    feedbacks: Array<{ rating: number; complaintCategory?: string | null }>,
    googleReviews: Array<{ rating: number; sentiment?: string | null }>,
  ) {
    const ratings = [
      ...feedbacks.map((f) => f.rating),
      ...googleReviews.map((g) => g.rating),
    ];
    const total = ratings.length;
    if (total === 0) return [];

    const satisfied = ratings.filter((r) => r >= 4).length;
    const csat = Math.round((satisfied / total) * 100);
    const negatives = ratings.filter((r) => r <= 2).length;

    const complaintCounts = new Map<string, number>();
    for (const f of feedbacks) {
      const c = f.complaintCategory;
      if (c && c !== 'None') complaintCounts.set(c, (complaintCounts.get(c) || 0) + 1);
    }
    const topComplaint = [...complaintCounts.entries()].sort((a, b) => b[1] - a[1])[0];

    const derived: Array<{ insight: string; category: string }> = [
      {
        insight: `CSAT is ${csat}% across ${total} rating(s). ${
          csat >= 80
            ? 'Strong — keep reinforcing what customers already like.'
            : 'There is room to improve; prioritise the concerns below.'
        }`,
        category: 'CSAT_OVERVIEW',
      },
    ];
    if (satisfied > 0) {
      derived.push({
        insight: `${satisfied} of ${total} customers rated you 4★ or higher — highlight these happy customers in your marketing.`,
        category: 'POSITIVE_HIGHLIGHT',
      });
    }
    if (negatives > 0 || topComplaint) {
      derived.push({
        insight: topComplaint
          ? `Most common complaint theme: "${topComplaint[0]}" (${topComplaint[1]} mention(s)). Address this operationally to lift ratings.`
          : `${negatives} low rating(s) (≤2★) detected. Follow up with these customers to recover the relationship.`,
        category: 'COMPLAINT_TREND',
      });
    }

    await this.prisma.reputationInsight.deleteMany({ where: { workspaceId } });
    const saved = [];
    for (const d of derived) {
      saved.push(
        await this.prisma.reputationInsight.create({
          data: { workspaceId, insight: d.insight, category: d.category },
        }),
      );
    }
    this.logger.log(`Compiled ${saved.length} rule-based insights (AI unavailable).`);
    return saved;
  }
}
