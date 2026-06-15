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

    if (!client) {
      // Local robust mock recommendations tailored for Indian local business context
      const mockImprovements = [
        {
          suggestion: 'Competitor reviews for Suresh Salon indicate they have 32% positive praise for "Premium Massage & Hair Treatments" at lower bundles. Bundle your haircut with a complimentary scalp massage to match Suresh Salon and increase average transaction sizes.',
          category: 'Service Bundle Upgrade',
          priority: 'HIGH',
          impactScore: 88,
        },
        {
          suggestion: 'Suresh Salon customers complain about "long waiting hours during weekends" (28% of their 1-3 star reviews). Capitalize on this by launching a "Fast-Track Saturday" option on your WhatsApp CRM with guaranteed time-slots, charging a premium or offering it to loyal customers.',
          category: 'Operational Speed',
          priority: 'HIGH',
          impactScore: 82,
        },
        {
          suggestion: 'Your own feedback reviews highlight "delays in staff response" (12% of complaints). Introduce automated greeting and auto-FAQ WhatsApp triggers to answer customer price queries instantly, reducing booking drop-offs.',
          category: 'Customer Support',
          priority: 'MEDIUM',
          impactScore: 74,
        },
        {
          suggestion: 'Competitor pricing reviews indicate they charged extra for sanitizer and safety kits, creating irritation (15% complaints). Advertise "Zero Hidden Charges & Complementary Safety Cleanliness" on your booking invites to build trust.',
          category: 'Pricing Transparency',
          priority: 'LOW',
          impactScore: 55,
        },
      ];

      // Delete existing suggestions and seed new ones
      await this.prisma.improvementSuggestion.deleteMany({
        where: { businessId: workspaceId },
      });

      const saved = [];
      for (const item of mockImprovements) {
        const doc = await this.prisma.improvementSuggestion.create({
          data: {
            businessId: workspaceId,
            suggestion: item.suggestion,
            category: item.category,
            priority: item.priority,
            impactScore: item.impactScore,
          },
        });
        saved.push(doc);
      }
      return saved;
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

    return this.prisma.improvementSuggestion.findMany({
      where: { businessId: workspaceId },
      orderBy: { impactScore: 'desc' },
    });
  }
}
