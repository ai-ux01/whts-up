import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class AIRecommendationsService {
  private readonly logger = new Logger(AIRecommendationsService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

  /**
   * List all current improvement suggestions for a workspace.
   */
  async getImprovements(workspaceId: string) {
    this.logger.log(`Listing improvement suggestions for workspace ${workspaceId}...`);

    const suggestions = await this.prisma.improvementSuggestion.findMany({
      where: { businessId: workspaceId },
      orderBy: { impactScore: 'desc' },
    });

    if (suggestions.length > 0) {
      return suggestions;
    }

    // Auto-generate if none exist yet
    return this.generateImprovements(workspaceId);
  }

  /**
   * Generates or regenerates actionable product/service improvements using OpenAI or smart heuristics.
   */
  async generateImprovements(workspaceId: string) {
    this.logger.log(`Generating fresh AI recommendations for workspace ${workspaceId}...`);

    // Fetch competitors & their reviews to compare complaints
    const competitors = await this.prisma.competitor.findMany({
      where: { workspaceId },
      include: { reviews: true },
    });

    const [ownFeedbacks, ownReviews] = await Promise.all([
      this.prisma.feedback.findMany({ where: { workspaceId } }),
      this.prisma.googleReview.findMany({ where: { workspaceId } }),
    ]);

    const client = this.aiService.getClient();
    const model = this.aiService.getChatModel();

    // No AI configured → derive recommendations from real complaint data.
    if (!client) {
      return this.saveDerivedImprovements(workspaceId, competitors, ownFeedbacks, ownReviews);
    }

    try {
      // Structure inputs for OpenAI context
      const competitorComplaintsDump = competitors
        .flatMap((c) =>
          c.reviews
            .filter((r) => r.rating <= 3)
            .map((r) => `[Comp: ${c.name}, Complaint: ${r.complaintCategory || 'Misc'}, text: "${r.reviewText || ''}"]`)
        )
        .slice(0, 30)
        .join('\n');

      const ownComplaintsDump = [
        ...ownFeedbacks.filter((f) => f.rating <= 3).map((f) => `[Our business WhatsApp Feedback: rating ${f.rating}, Complaint: ${f.complaintCategory || 'Misc'}, comment: "${f.feedback || ''}"]`),
        ...ownReviews.filter((r) => r.rating <= 3).map((r) => `[Our business Google Review: rating ${r.rating}, comment: "${r.reviewText || ''}"]`),
      ]
        .slice(0, 20)
        .join('\n');

      const prompt = `You are a growth hacker and AI business coach for local Indian SMBs.
Compare our business complaints with competitor complaints to generate exactly 3 or 4 highly strategic, actionable "Improvement Recommendations".

Our Competitor Complaints (Negative Reviews):
${competitorComplaintsDump || 'No competitor complaints recorded.'}

Our Business Complaints:
${ownComplaintsDump || 'Our business has clean/no complaints recorded.'}

Generate actionable improvements that:
- Address weaknesses compared to competitors or double-down on competitor pain points.
- Give each card an "impactScore" (an integer from 1 to 100 representing growth potential), a "category" (e.g., Customer Support, Operational Speed, Pricing Transparency, Service Bundle Upgrade), and a "priority" (HIGH, MEDIUM, or LOW).
- Use Hinglish naturally inside the suggestion text, referring to local competitor names and real tactical details.

You must respond in strict, valid JSON format matching this schema:
{
  "improvements": [
    {
      "suggestion": "Detailed improvement suggestion text...",
      "category": "Customer Support" | "Operational Speed" | "Pricing Transparency" | "Service Bundle Upgrade" | etc.,
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "impactScore": 85
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
        const list = parsed.improvements || [];

        await this.prisma.improvementSuggestion.deleteMany({
          where: { businessId: workspaceId },
        });

        const saved = [];
        for (const item of list) {
          const doc = await this.prisma.improvementSuggestion.create({
            data: {
              businessId: workspaceId,
              suggestion: item.suggestion,
              category: item.category || 'General',
              priority: item.priority || 'MEDIUM',
              impactScore: Number(item.impactScore) || 50,
            },
          });
          saved.push(doc);
        }
        return saved;
      }
    } catch (err) {
      this.logger.error('Error generating AI Recommendations:', err);
    }

    // AI failed — derive recommendations from real complaint data.
    return this.saveDerivedImprovements(workspaceId, competitors, ownFeedbacks, ownReviews);
  }

  /**
   * Rule-based improvement recommendations computed from REAL competitor and own
   * complaint categories. Turns the most frequent complaint themes into concrete
   * suggestions with a data-derived impact score. Never fabricates competitor names.
   */
  private async saveDerivedImprovements(
    workspaceId: string,
    competitors: Array<{ name: string; reviews: Array<{ rating: number; complaintCategory: string | null; praiseCategory: string | null }> }>,
    ownFeedbacks: Array<{ rating: number; complaintCategory: string | null }>,
    ownReviews: Array<{ rating: number }>,
  ) {
    type Rec = { suggestion: string; category: string; priority: string; impactScore: number };
    const recs: Rec[] = [];

    // Competitor complaint themes → opportunities to beat them.
    const compTally = new Map<string, { count: number; names: Set<string> }>();
    for (const c of competitors) {
      for (const r of c.reviews) {
        if (r.rating <= 3 && r.complaintCategory) {
          const e = compTally.get(r.complaintCategory) || { count: 0, names: new Set<string>() };
          e.count += 1;
          e.names.add(c.name);
          compTally.set(r.complaintCategory, e);
        }
      }
    }
    const rankedComp = [...compTally.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 3);
    rankedComp.forEach(([cat, info], i) => {
      recs.push({
        suggestion: `Competitors (${[...info.names].slice(0, 2).join(', ')}) get ${info.count} complaint(s) about "${cat}". Make "${cat}" a visible promise in your offers and WhatsApp messaging to win their unhappy customers.`,
        category: cat,
        priority: i === 0 ? 'HIGH' : i === 1 ? 'MEDIUM' : 'LOW',
        impactScore: Math.min(95, 60 + info.count * 8),
      });
    });

    // Our own complaint themes → things to fix internally.
    const ownTally = new Map<string, number>();
    for (const f of ownFeedbacks) {
      if (f.rating <= 3 && f.complaintCategory) ownTally.set(f.complaintCategory, (ownTally.get(f.complaintCategory) || 0) + 1);
    }
    const rankedOwn = [...ownTally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2);
    for (const [cat, n] of rankedOwn) {
      recs.push({
        suggestion: `Your own customers raised "${cat}" ${n} time(s). Prioritise fixing this — set up automated WhatsApp follow-ups to close the loop and recover ratings.`,
        category: cat,
        priority: 'HIGH',
        impactScore: Math.min(90, 55 + n * 10),
      });
    }

    if (recs.length === 0) {
      return this.prisma.improvementSuggestion.findMany({
        where: { businessId: workspaceId },
        orderBy: { impactScore: 'desc' },
      });
    }

    await this.prisma.improvementSuggestion.deleteMany({ where: { businessId: workspaceId } });
    const saved = [];
    for (const r of recs) {
      saved.push(
        await this.prisma.improvementSuggestion.create({
          data: {
            businessId: workspaceId,
            suggestion: r.suggestion,
            category: r.category,
            priority: r.priority,
            impactScore: r.impactScore,
          },
        }),
      );
    }
    this.logger.log(`Compiled ${saved.length} rule-based improvements (AI unavailable).`);
    return saved;
  }
}
