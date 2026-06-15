import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleBusinessService } from '../google-business/google-business.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    private prisma: PrismaService,
    private googleBusinessService: GoogleBusinessService,
    private aiService: AiService,
  ) {}

  async listReviews(
    workspaceId: string,
    filters: { rating?: number; sentiment?: string; page?: number; limit?: number },
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = { workspaceId };
    if (filters.rating) where.rating = filters.rating;
    if (filters.sentiment) where.sentiment = filters.sentiment;

    const [total, data] = await Promise.all([
      this.prisma.googleReview.count({ where }),
      this.prisma.googleReview.findMany({
        where,
        orderBy: { reviewDate: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data,
    };
  }

  async syncReviews(workspaceId: string) {
    const count = await this.googleBusinessService.syncGoogleReviews(workspaceId);
    return { success: true, syncedReviewsCount: count };
  }

  async generateAiReply(workspaceId: string, id: string) {
    const review = await this.prisma.googleReview.findFirst({
      where: { id, workspaceId },
    });

    if (!review) {
      throw new NotFoundException('Google review not found');
    }

    const client = this.aiService.getClient();
    const model = this.aiService.getChatModel();

    if (!client) {
      return {
        reply: `Thank you so much for your rating! We appreciate your support. 🙏`,
      };
    }

    try {
      const prompt = `You are an elite, polite, and professional AI brand manager representing an Indian local business.
Draft a short, highly professional, and natural-sounding response to the following customer review.

Review Details:
- Author Name: ${review.author}
- Star Rating: ${review.rating} / 5
- Review Content: "${review.reviewText || 'No text review comment, only star rating'}"

Guidelines:
1. Sound authentic and warm. AVOID generic robotic templates like "We apologize for the inconvenience".
2. Match the language style: If they wrote in Hindi or Hinglish (e.g. "acha tha", "slow tha"), write a friendly Hinglish response. Otherwise, write a highly polished English response.
3. For positive ratings (4 or 5 stars): Express deep gratitude, mention specific positive details if provided, and state that we look forward to serving them again.
4. For negative ratings (1, 2, or 3 stars): Apologize sincerely, address their operational concern if mentioned (e.g. delivery delays, food temperature, cashier behavior), and assure them we are actively fixing this issue.
5. Keep it concise (maximum 3 sentences or 60 words). Do not include any placeholder strings.

Reply text only.`;

      const completion = await client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
        max_tokens: 150,
      });

      const reply = completion.choices[0]?.message?.content?.trim() || '';
      return { reply };
    } catch (err) {
      this.logger.error('Failed to generate AI review reply:', err);
      return {
        reply: `Thank you for sharing your feedback, ${review.author}. We appreciate your response and will work on improving our services.`,
      };
    }
  }

  async submitReply(workspaceId: string, id: string, replyText: string) {
    const review = await this.prisma.googleReview.findFirst({
      where: { id, workspaceId },
    });

    if (!review) {
      throw new NotFoundException('Google review not found');
    }

    // In a live integration, this calls the Google My Business API patches endpoint.
    // For now, we update our local database state.
    const updatedReview = await this.prisma.googleReview.update({
      where: { id },
      data: {
        replyText,
        repliedAt: new Date(),
      },
    });

    this.logger.log(`Published reply to review ${id} by author ${review.author}`);
    return updatedReview;
  }
}
