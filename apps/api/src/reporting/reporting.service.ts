import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Compiles executive competitor intelligence dataset into CSV format.
   */
  async generateExecutiveCsv(workspaceId: string): Promise<string> {
    this.logger.log(`Compiling executive CSV digest for workspace ${workspaceId}...`);

    // 1. Fetch own stats
    const [ownFeedbacks, ownReviews] = await Promise.all([
      this.prisma.feedback.findMany({ where: { workspaceId } }),
      this.prisma.googleReview.findMany({ where: { workspaceId } }),
    ]);

    const ownTotal = ownFeedbacks.length + ownReviews.length;
    const ownRatingSum =
      ownFeedbacks.reduce((acc, f) => acc + f.rating, 0) +
      ownReviews.reduce((acc, r) => acc + r.rating, 0);
    const ownAverageRating = ownTotal > 0 ? parseFloat((ownRatingSum / ownTotal).toFixed(2)) : 0;

    // 2. Fetch competitor stats
    const competitors = await this.prisma.competitor.findMany({
      where: { workspaceId },
      include: { reviews: true },
    });

    // 3. Fetch improvement suggestions
    const improvements = await this.prisma.improvementSuggestion.findMany({
      where: { businessId: workspaceId },
      orderBy: { impactScore: 'desc' },
    });

    // 4. Fetch market gaps
    const marketGaps = await this.prisma.marketInsight.findMany({
      where: { workspaceId, category: 'MARKET_GAP' },
    });

    // Build the CSV string
    const csvLines: string[] = [];

    // Header Metadata
    csvLines.push('================================================================');
    csvLines.push('AI REPUTATION OS - COMPETITOR INTELLIGENCE EXECUTIVE DIGEST');
    csvLines.push(`Generated On: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`);
    csvLines.push(`Tenant Workspace ID: ${workspaceId}`);
    csvLines.push('================================================================');
    csvLines.push('');

    // Section 1: Business Overview
    csvLines.push('SECTION 1: OWN BUSINESS REPUTATION SUMMARY');
    csvLines.push('Parameter,Value');
    csvLines.push(`Total Reviews & Feedbacks Count,${ownTotal}`);
    csvLines.push(`Average Reputation Rating,${ownAverageRating}`);
    csvLines.push('');

    // Section 2: Competitors Comparison
    csvLines.push('SECTION 2: TRACKED COMPETITORS ANALYSIS');
    csvLines.push('Competitor Name,Category,Location,Average Rating,Total Reviews,Top Praise Category,Top Complaint Category');

    for (const comp of competitors) {
      const totalReviews = comp.reviews.length;
      const ratingSum = comp.reviews.reduce((acc, r) => acc + r.rating, 0);
      const avg = totalReviews > 0 ? parseFloat((ratingSum / totalReviews).toFixed(2)) : comp.averageRating;

      const complaintCounts = new Map<string, number>();
      const praiseCounts = new Map<string, number>();
      for (const r of comp.reviews) {
        if (r.complaintCategory) {
          complaintCounts.set(r.complaintCategory, (complaintCounts.get(r.complaintCategory) || 0) + 1);
        }
        if (r.praiseCategory) {
          praiseCounts.set(r.praiseCategory, (praiseCounts.get(r.praiseCategory) || 0) + 1);
        }
      }

      const topComplaint = Array.from(complaintCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';
      const topPraise = Array.from(praiseCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

      const row = [
        this.escapeCsv(comp.name),
        this.escapeCsv(comp.category),
        this.escapeCsv(comp.location),
        avg,
        totalReviews || comp.totalReviews,
        this.escapeCsv(topPraise),
        this.escapeCsv(topComplaint),
      ].join(',');
      csvLines.push(row);
    }
    csvLines.push('');

    // Section 3: Market Gaps
    csvLines.push('SECTION 3: AI MARKET OPPORTUNITIES & GAPS');
    csvLines.push('Gap Opportunity,Description');
    for (const gap of marketGaps) {
      csvLines.push([
        this.escapeCsv(gap.title),
        this.escapeCsv(gap.description),
      ].join(','));
    }
    csvLines.push('');

    // Section 4: Actionable Improvements
    csvLines.push('SECTION 4: AI ACTIONABLE RECOMMENDATION PLAYBOOK');
    csvLines.push('Recommendation Card,Category,Priority,Impact Score (1-100)');
    for (const imp of improvements) {
      csvLines.push([
        this.escapeCsv(imp.suggestion),
        this.escapeCsv(imp.category),
        imp.priority,
        imp.impactScore,
      ].join(','));
    }

    return csvLines.join('\n');
  }

  private escapeCsv(val: string): string {
    if (!val) return 'None';
    let clean = val.replace(/"/g, '""');
    if (clean.includes(',') || clean.includes('\n') || clean.includes('"')) {
      clean = `"${clean}"`;
    }
    return clean;
  }
}
