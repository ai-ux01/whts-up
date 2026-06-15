import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewsAnalysisService {
  private readonly logger = new Logger(ReviewsAnalysisService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Compiles consolidated competitor-comparison metrics for dashboards
   */
  async getComparisonData(workspaceId: string) {
    this.logger.log(`Compiling competitor comparison metrics for workspace ${workspaceId}...`);

    // 1. Fetch own reviews & feedbacks
    const [ownFeedbacks, ownReviews] = await Promise.all([
      this.prisma.feedback.findMany({ where: { workspaceId } }),
      this.prisma.googleReview.findMany({ where: { workspaceId } }),
    ]);

    const ownTotal = ownFeedbacks.length + ownReviews.length;
    const ownRatingSum =
      ownFeedbacks.reduce((acc, f) => acc + f.rating, 0) +
      ownReviews.reduce((acc, r) => acc + r.rating, 0);
    const ownAverageRating = ownTotal > 0 ? parseFloat((ownRatingSum / ownTotal).toFixed(2)) : 0;

    // Calculate own sentiment ratios
    const ownSentiments = [
      ...ownFeedbacks.map((f) => f.sentiment || 'NEUTRAL'),
      ...ownReviews.map((r) => r.sentiment || 'NEUTRAL'),
    ];
    const ownSentimentCounts = { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 };
    for (const s of ownSentiments) {
      const norm = s.toUpperCase();
      if (norm === 'POSITIVE') ownSentimentCounts.POSITIVE++;
      else if (norm === 'NEGATIVE') ownSentimentCounts.NEGATIVE++;
      else ownSentimentCounts.NEUTRAL++;
    }
    const ownPositiveRate = ownTotal > 0 ? Math.round((ownSentimentCounts.POSITIVE / ownTotal) * 100) : 0;

    // 2. Fetch tracked competitors & their seeded reviews
    const competitors = await this.prisma.competitor.findMany({
      where: { workspaceId },
      include: { reviews: true },
    });

    const competitorComparisonData = competitors.map((c) => {
      const totalReviews = c.reviews.length;
      const ratingSum = c.reviews.reduce((acc, r) => acc + r.rating, 0);
      const avg = totalReviews > 0 ? parseFloat((ratingSum / totalReviews).toFixed(2)) : c.averageRating;

      // Sentiment distribution
      const sentCounts = { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 };
      for (const r of c.reviews) {
        const s = (r.sentiment || 'NEUTRAL').toUpperCase();
        if (s === 'POSITIVE') sentCounts.POSITIVE++;
        else if (s === 'NEGATIVE') sentCounts.NEGATIVE++;
        else sentCounts.NEUTRAL++;
      }
      const positiveRate = totalReviews > 0 ? Math.round((sentCounts.POSITIVE / totalReviews) * 100) : 0;

      // Extract complaint frequencies
      const complaintCounts = new Map<string, number>();
      const praiseCounts = new Map<string, number>();

      for (const r of c.reviews) {
        if (r.complaintCategory) {
          complaintCounts.set(r.complaintCategory, (complaintCounts.get(r.complaintCategory) || 0) + 1);
        }
        if (r.praiseCategory) {
          praiseCounts.set(r.praiseCategory, (praiseCounts.get(r.praiseCategory) || 0) + 1);
        }
      }

      return {
        id: c.id,
        name: c.name,
        category: c.category,
        location: c.location,
        averageRating: avg,
        totalReviews: totalReviews || c.totalReviews,
        positiveRate,
        topComplaint: Array.from(complaintCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None',
        topPraise: Array.from(praiseCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None',
      };
    });

    // 3. Compile charts datasets: Praise vs Complaint category share
    const allCompReviews = competitors.flatMap((c) => c.reviews);

    const compComplaintsMap = new Map<string, number>();
    for (const r of allCompReviews) {
      if (r.complaintCategory) {
        compComplaintsMap.set(r.complaintCategory, (compComplaintsMap.get(r.complaintCategory) || 0) + 1);
      }
    }
    const competitorComplaints = Array.from(compComplaintsMap.entries()).map(([name, count]) => ({
      category: name,
      count,
    })).sort((a, b) => b.count - a.count);

    // 4. Compile weekly rating trend comparison
    const trends = this.compileComparisonTrends(ownFeedbacks, ownReviews, competitors);

    return {
      ownBusiness: {
        name: 'Your Business',
        averageRating: ownAverageRating,
        totalReviews: ownTotal,
        positiveRate: ownPositiveRate,
        sentiment: ownSentimentCounts,
      },
      competitors: competitorComparisonData,
      competitorComplaints,
      trends,
    };
  }

  private compileComparisonTrends(ownFeedbacks: any[], ownReviews: any[], competitors: any[]) {
    const now = new Date();
    const trendData = [];

    // Past 4 weeks
    for (let i = 3; i >= 0; i--) {
      const dateCutoff = new Date(now.getTime() - i * 7 * 24 * 3600 * 1000);
      const weekLabel = `Week ${4 - i}`;

      // Filter own ratings
      const accumulatedOwn = [
        ...ownFeedbacks.filter((f) => new Date(f.createdAt) <= dateCutoff),
        ...ownReviews.filter((r) => new Date(r.reviewDate) <= dateCutoff),
      ];
      const ownSum = accumulatedOwn.reduce((acc, val) => acc + val.rating, 0);
      const ownAvg = accumulatedOwn.length > 0 ? parseFloat((ownSum / accumulatedOwn.length).toFixed(2)) : 4.2;

      // Filter competitor ratings
      const accumulatedComp = competitors.flatMap((c) =>
        c.reviews.filter((r: any) => new Date(r.reviewDate) <= dateCutoff),
      );
      const compSum = accumulatedComp.reduce((acc, val) => acc + val.rating, 0);
      const compAvg = accumulatedComp.length > 0 ? parseFloat((compSum / accumulatedComp.length).toFixed(2)) : 4.4;

      trendData.push({
        name: weekLabel,
        yourRating: ownAvg,
        competitorsAverageRating: compAvg,
      });
    }

    return trendData;
  }
}
