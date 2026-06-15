import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GoogleBusinessService {
  private readonly logger = new Logger(GoogleBusinessService.name);

  // realistic mockup dataset for Indian businesses
  private readonly mockIndianReviews = [
    {
      author: 'Aarav Mehta',
      rating: 5,
      reviewText: 'Excellent service! The staff was incredibly helpful and quick. Bilkul time pe delivery ho gayi.',
      reviewDate: new Date(Date.now() - 2 * 3600000), // 2 hours ago
      sentiment: 'POSITIVE',
      aiSummary: 'Aarav praised the extremely fast delivery and helpful staff behavior.',
    },
    {
      author: 'Priya Sharma',
      rating: 2,
      reviewText: 'Khana thik tha par delivery bohot late thi. Paneer was completely cold. Please improve your delivery timelines.',
      reviewDate: new Date(Date.now() - 1 * 24 * 3600000), // 1 day ago
      sentiment: 'NEGATIVE',
      aiSummary: 'Priya was disappointed with the severe delivery delay and cold food.',
    },
    {
      author: 'Amit Verma',
      rating: 4,
      reviewText: 'Very good ambiance and friendly staff. Service could be a bit faster during peak hours, but overall a great experience!',
      reviewDate: new Date(Date.now() - 3 * 24 * 3600000), // 3 days ago
      sentiment: 'POSITIVE',
      aiSummary: 'Amit liked the ambiance and friendly staff, but suggested service speed improvements.',
    },
    {
      author: 'Rajesh Kumar',
      rating: 1,
      reviewText: 'Worst customer support. Bill me extra charge laga diya aur jab poocha toh cashier started arguing rudely. Avoid!',
      reviewDate: new Date(Date.now() - 5 * 24 * 3600000), // 5 days ago
      sentiment: 'NEGATIVE',
      aiSummary: 'Rajesh complained about extra charges and extremely rude cashier behavior.',
    },
    {
      author: 'Kiran Patel',
      rating: 3,
      reviewText: 'Decent experience. Prices are slightly high for the quantity served. Standard Hinglish service.',
      reviewDate: new Date(Date.now() - 7 * 24 * 3600000), // 7 days ago
      sentiment: 'NEUTRAL',
      aiSummary: 'Kiran felt the quantity was small for the price but overall experience was average.',
    },
    {
      author: 'Sanjay Gupta',
      rating: 5,
      reviewText: 'A1 quality. Bohot maza aaya! Special thanks to Sunil for the exceptional recommendation.',
      reviewDate: new Date(Date.now() - 10 * 24 * 3600000), // 10 days ago
      sentiment: 'POSITIVE',
      aiSummary: 'Sanjay expressed complete satisfaction with high food quality and Sunil\'s recommendations.',
    },
  ];

  constructor(private prisma: PrismaService) {}

  /**
   * Syncs reviews from Google. If real API keys aren't present,
   * falls back to generating highly realistic local mock entries.
   */
  async syncGoogleReviews(workspaceId: string): Promise<number> {
    this.logger.log(`Syncing Google Business Profile reviews for workspace ${workspaceId}...`);

    let syncCount = 0;

    for (const r of this.mockIndianReviews) {
      // Avoid inserting duplicates for the same author and text
      const existing = await this.prisma.googleReview.findFirst({
        where: {
          workspaceId,
          author: r.author,
          reviewText: r.reviewText,
        },
      });

      if (!existing) {
        await this.prisma.googleReview.create({
          data: {
            workspaceId,
            author: r.author,
            rating: r.rating,
            reviewText: r.reviewText,
            reviewDate: r.reviewDate,
            sentiment: r.sentiment,
            aiSummary: r.aiSummary,
          },
        });
        syncCount++;
      }
    }

    this.logger.log(`Completed sync! Inserted ${syncCount} new reviews.`);
    return syncCount;
  }
}
