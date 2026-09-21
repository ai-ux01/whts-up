import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReputationService {
  private readonly logger = new Logger(ReputationService.name);

  constructor(private prisma: PrismaService) {}

  async getDashboardData(workspaceId: string) {
    this.logger.log(`Compiling reputation dashboard stats for workspace ${workspaceId}...`);

    // Fetch all feedbacks and google reviews for this workspace
    const [feedbacks, googleReviews, reviewRequestsSent] = await Promise.all([
      this.prisma.feedback.findMany({ where: { workspaceId } }),
      this.prisma.googleReview.findMany({ where: { workspaceId } }),
      this.prisma.reviewRequest.count({ where: { workspaceId } }),
    ]);

    const totalFeedbacks = feedbacks.length;
    const totalGoogleReviews = googleReviews.length;
    const totalCount = totalFeedbacks + totalGoogleReviews;

    // Default empty state
    if (totalCount === 0) {
      return {
        summary: {
          totalReviews: 0,
          totalFeedbacks: 0,
          totalGoogleReviews: 0,
          reviewRequestsSent,
          averageRating: 0,
          csat: 0,
          nps: 0,
          positiveRatio: 0,
          negativeRatio: 0,
        },
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        sentimentDistribution: { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 },
        complaintCategories: [],
        trends: [],
      };
    }

    // Combine ratings
    const allRatings = [
      ...feedbacks.map((f) => f.rating),
      ...googleReviews.map((g) => g.rating),
    ];

    const sumRatings = allRatings.reduce((acc, val) => acc + val, 0);
    const averageRating = parseFloat((sumRatings / totalCount).toFixed(2));

    // Calculate CSAT: (ratings of 4 or 5) / (total ratings) * 100
    const satisfiedCount = allRatings.filter((r) => r >= 4).length;
    const csat = parseFloat(((satisfiedCount / totalCount) * 100).toFixed(1));

    // Calculate NPS: % Promoters (4-5) - % Detractors (1-2)
    const promoters = allRatings.filter((r) => r >= 4).length;
    const detractors = allRatings.filter((r) => r <= 2).length;
    const promoterPct = (promoters / totalCount) * 100;
    const detractorPct = (detractors / totalCount) * 100;
    const nps = Math.round(promoterPct - detractorPct);

    // Calculate Sentiment distribution
    const allSentiments = [
      ...feedbacks.map((f) => f.sentiment || 'NEUTRAL'),
      ...googleReviews.map((g) => g.sentiment || 'NEUTRAL'),
    ];

    const sentimentCounts = { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 };
    for (const s of allSentiments) {
      const norm = s.toUpperCase();
      if (norm === 'POSITIVE') sentimentCounts.POSITIVE++;
      else if (norm === 'NEGATIVE') sentimentCounts.NEGATIVE++;
      else sentimentCounts.NEUTRAL++;
    }

    const positiveRatio = parseFloat(((sentimentCounts.POSITIVE / totalCount) * 100).toFixed(1));
    const negativeRatio = parseFloat(((sentimentCounts.NEGATIVE / totalCount) * 100).toFixed(1));

    // Calculate Star Rating distribution
    const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const r of allRatings) {
      const star = r as 1 | 2 | 3 | 4 | 5;
      if (ratingCounts[star] !== undefined) ratingCounts[star]++;
    }

    // Aggregate Complaint Categories (only negatives or neutrals with categories)
    const categoryMap = new Map<string, number>();
    const allItems = [...feedbacks, ...googleReviews];

    for (const item of allItems) {
      const cat = (item as any).complaintCategory;
      if (cat && cat !== 'None') {
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
      }
    }

    const complaintCategories = Array.from(categoryMap.entries()).map(([name, count]) => ({
      category: name,
      count,
    })).sort((a, b) => b.count - a.count);

    // Compile trends from real data only (no fabricated curve).
    const trends = this.generateTrends(allItems);

    return {
      summary: {
        totalReviews: totalCount,
        totalFeedbacks,
        totalGoogleReviews,
        reviewRequestsSent,
        averageRating,
        csat,
        nps,
        positiveRatio,
        negativeRatio,
      },
      ratingDistribution: ratingCounts,
      sentimentDistribution: sentimentCounts,
      complaintCategories,
      trends,
    };
  }

  private generateTrends(items: any[]) {
    // Cumulative review stats over the past 5 weeks — derived only from real
    // items. Empty weeks show zeros rather than fabricated numbers.
    const now = new Date();
    const trendData = [];

    for (let i = 4; i >= 0; i--) {
      const dateCutoff = new Date(now.getTime() - i * 7 * 24 * 3600 * 1000);
      const weekLabel = `Week ${5 - i}`;

      const accumulatedItems = items.filter((item) => {
        const itemDate = new Date(item.createdAt || item.reviewDate);
        return itemDate <= dateCutoff;
      });

      const count = accumulatedItems.length;
      const sum = accumulatedItems.reduce((acc, item) => acc + item.rating, 0);
      const avg = count > 0 ? parseFloat((sum / count).toFixed(2)) : 0;

      const positiveCount = accumulatedItems.filter((item) => {
        const s = (item.sentiment || 'NEUTRAL').toUpperCase();
        return s === 'POSITIVE';
      }).length;
      const posRate = count > 0 ? Math.round((positiveCount / count) * 100) : 0;

      trendData.push({
        name: weekLabel,
        reviewsCount: count,
        averageRating: avg,
        positiveRate: posRate,
      });
    }

    return trendData;
  }
}
