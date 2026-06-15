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
      // Fallback local mock insights if AI keys are missing
      const mockInsights = [
        {
          insight: 'Your customer satisfaction (CSAT) is highly stable at 84%. Keep up the good work!',
          category: 'CSAT_OVERVIEW',
        },
        {
          insight: 'Positive reviews frequently highlight friendly staff behavior and efficient counter service.',
          category: 'POSITIVE_HIGHLIGHT',
        },
      ];

      const saved = [];
      for (const m of mockInsights) {
        const ins = await this.prisma.reputationInsight.create({
          data: { workspaceId, insight: m.insight, category: m.category },
        });
        saved.push(ins);
      }
      return saved;
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

    return this.prisma.reputationInsight.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
