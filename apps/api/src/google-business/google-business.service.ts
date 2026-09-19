import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

const PLACE_DETAILS = 'https://maps.googleapis.com/maps/api/place/details/json';

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

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  private isProd(): boolean {
    return this.config.get<string>('NODE_ENV') === 'production';
  }

  /**
   * Syncs reviews from Google.
   *
   * Live path: when GOOGLE_PLACES_API_KEY is set and the workspace has a
   * googlePlaceId, fetches real reviews via the Google Place Details API.
   * Fallback: seeds a curated demo dataset (clearly logged) so the feature
   * is explorable without credentials.
   */
  async syncGoogleReviews(workspaceId: string): Promise<number> {
    this.logger.log(`Syncing Google Business Profile reviews for workspace ${workspaceId}...`);

    const apiKey = this.config.get<string>('GOOGLE_PLACES_API_KEY')?.trim();
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { googlePlaceId: true },
    });

    if (apiKey && workspace?.googlePlaceId) {
      // Live path. In production, surface failures instead of masking with demo data.
      try {
        return await this.syncLiveReviews(workspaceId, apiKey, workspace.googlePlaceId);
      } catch (err) {
        this.logger.error(`Live Google review sync failed: ${(err as Error).message}`);
        if (this.isProd()) {
          throw new BadRequestException(
            'Google review sync failed. Check GOOGLE_PLACES_API_KEY and the workspace Google Place ID.',
          );
        }
        this.logger.warn('Falling back to demo data (non-production).');
      }
    } else if (this.isProd()) {
      // Do NOT silently seed fake reviews in production.
      throw new BadRequestException(
        'Google reviews are not configured. Set GOOGLE_PLACES_API_KEY and connect a Google Place ID for this workspace.',
      );
    } else {
      this.logger.warn(
        'GOOGLE_PLACES_API_KEY or workspace googlePlaceId missing — seeding demo reviews (non-production only).',
      );
    }

    return this.seedDemoReviews(workspaceId);
  }

  private async syncLiveReviews(
    workspaceId: string,
    apiKey: string,
    placeId: string,
  ): Promise<number> {
    const url = `${PLACE_DETAILS}?place_id=${encodeURIComponent(placeId)}&fields=reviews&key=${apiKey}`;
    const res = await fetch(url);
    const data = (await res.json()) as {
      status?: string;
      error_message?: string;
      result?: {
        reviews?: Array<{ author_name: string; rating: number; text: string; time: number }>;
      };
    };
    if (data.status && data.status !== 'OK') {
      throw new Error(data.error_message || data.status);
    }

    let syncCount = 0;
    for (const rv of data.result?.reviews || []) {
      const existing = await this.prisma.googleReview.findFirst({
        where: { workspaceId, author: rv.author_name, reviewText: rv.text },
      });
      if (existing) continue;

      await this.prisma.googleReview.create({
        data: {
          workspaceId,
          author: rv.author_name,
          rating: rv.rating,
          reviewText: rv.text,
          reviewDate: new Date(rv.time * 1000),
          sentiment: rv.rating >= 4 ? 'POSITIVE' : rv.rating <= 2 ? 'NEGATIVE' : 'NEUTRAL',
        },
      });
      syncCount++;
    }
    this.logger.log(`Live sync complete! Inserted ${syncCount} new Google reviews.`);
    return syncCount;
  }

  private async seedDemoReviews(workspaceId: string): Promise<number> {
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
