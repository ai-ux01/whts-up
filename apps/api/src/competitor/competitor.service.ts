import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MessagesService } from '../messages/messages.service';

const PLACES_TEXT_SEARCH = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
const PLACE_DETAILS = 'https://maps.googleapis.com/maps/api/place/details/json';

@Injectable()
export class CompetitorService {
  private readonly logger = new Logger(CompetitorService.name);

  // Pre-loaded list of Indian local business competitors across categories and cities
  private readonly mockIndianCompetitors = [
    // SALONS
    {
      name: 'Jean-Claude Biguine Salon Bandra',
      category: 'Salons',
      location: 'Mumbai',
      averageRating: 4.6,
      totalReviews: 320,
    },
    {
      name: 'Lakme Salon Bandra West',
      category: 'Salons',
      location: 'Mumbai',
      averageRating: 4.4,
      totalReviews: 210,
    },
    {
      name: 'Looks Salon Juhu',
      category: 'Salons',
      location: 'Mumbai',
      averageRating: 4.2,
      totalReviews: 140,
    },
    {
      name: 'Jawed Habib Hair Salon Patna',
      category: 'Salons',
      location: 'Patna',
      averageRating: 4.1,
      totalReviews: 95,
    },
    {
      name: 'VLCC Wellness & Salon Patna',
      category: 'Salons',
      location: 'Patna',
      averageRating: 4.3,
      totalReviews: 120,
    },

    // COACHING INSTITUTES
    {
      name: 'Super 30 Academy Patna',
      category: 'Coaching',
      location: 'Patna',
      averageRating: 4.9,
      totalReviews: 850,
    },
    {
      name: 'Patna Science Classes Boring Road',
      category: 'Coaching',
      location: 'Patna',
      averageRating: 4.4,
      totalReviews: 310,
    },
    {
      name: 'Chanakya IAS Academy Boring Road',
      category: 'Coaching',
      location: 'Patna',
      averageRating: 4.5,
      totalReviews: 420,
    },

    // CAFES / RESTAURANTS
    {
      name: 'The Bombay Canteen Lower Parel',
      category: 'Cafes',
      location: 'Mumbai',
      averageRating: 4.7,
      totalReviews: 1540,
    },
    {
      name: 'Bandra Coffee House',
      category: 'Cafes',
      location: 'Mumbai',
      averageRating: 4.3,
      totalReviews: 280,
    },
    {
      name: 'Patna Heights Cafe Boring Road',
      category: 'Cafes',
      location: 'Patna',
      averageRating: 4.0,
      totalReviews: 150,
    },

    // REAL ESTATE
    {
      name: 'Lodha Group Sales Office Juhu',
      category: 'Real Estate',
      location: 'Mumbai',
      averageRating: 4.5,
      totalReviews: 980,
    },
    {
      name: 'Godrej Properties Sales Bandra',
      category: 'Real Estate',
      location: 'Mumbai',
      averageRating: 4.3,
      totalReviews: 540,
    },
  ];

  // Seed customer reviews for each competitor during tracking
  private readonly mockCompetitorReviews: Record<string, Array<{
    reviewerName: string;
    rating: number;
    reviewText: string;
    sentiment: string;
    complaintCategory?: string;
    praiseCategory?: string;
  }>> = {
    'jean-claude biguine salon bandra': [
      {
        reviewerName: 'Rohan Deshmukh',
        rating: 5,
        reviewText: 'Great service! The hair stylists are top notch and highly professional. Excellent ambiance.',
        sentiment: 'POSITIVE',
        praiseCategory: 'Customer Service',
      },
      {
        reviewerName: 'Ananya Sen',
        rating: 2,
        reviewText: 'Bohot expensive hai as compared to services. Cut was average and they charge 20% extra as taxes without warning.',
        sentiment: 'NEGATIVE',
        complaintCategory: 'Pricing',
      },
      {
        reviewerName: 'Sameer Sawant',
        rating: 5,
        reviewText: 'Awesome haircut by Nitin. Highly recommended.',
        sentiment: 'POSITIVE',
        praiseCategory: 'Customer Service',
      },
    ],
    'lakme salon bandra west': [
      {
        reviewerName: 'Kajal Nair',
        rating: 4,
        reviewText: 'Decent experience. Staff is polite but appointment slot got delayed by 15 mins. Booking system works well.',
        sentiment: 'POSITIVE',
        praiseCategory: 'Customer Service',
      },
      {
        reviewerName: 'Sneha Rao',
        rating: 2,
        reviewText: 'Highly disappointed. Hair color completely ruined my hair texture. Very slow support when complaining.',
        sentiment: 'NEGATIVE',
        complaintCategory: 'Product Quality',
      },
    ],
    'looks salon juhu': [
      {
        reviewerName: 'Varun Dhawan',
        rating: 5,
        reviewText: 'Premium quality cuts and styling. The massage was very relaxing. Friendly response.',
        sentiment: 'POSITIVE',
        praiseCategory: 'Customer Service',
      },
      {
        reviewerName: 'Shruti Iyer',
        rating: 1,
        reviewText: 'Rude staff behaviour. Front desk receptionist started arguing over booking details. Avoid looks!',
        sentiment: 'NEGATIVE',
        complaintCategory: 'Staff Behavior',
      },
    ],
    'jawed habib hair salon patna': [
      {
        reviewerName: 'Manoj Prasad',
        rating: 4,
        reviewText: 'Good pocket friendly haircutting. Always crowded so booking beforehand is better.',
        sentiment: 'POSITIVE',
        praiseCategory: 'Pricing',
      },
      {
        reviewerName: 'Rinki Kumari',
        rating: 2,
        reviewText: 'Very unhygienic towels and scissors. Scissors were not clean. Never visiting boring road branch again.',
        sentiment: 'NEGATIVE',
        complaintCategory: 'Product Quality',
      },
    ],
    'vlcc wellness & salon patna': [
      {
        reviewerName: 'Puja Gupta',
        rating: 5,
        reviewText: 'Very relaxing skin therapy. Professional staff and clean cabins. Highly recommended.',
        sentiment: 'POSITIVE',
        praiseCategory: 'Customer Service',
      },
      {
        reviewerName: 'Amit Raj',
        rating: 3,
        reviewText: 'Average. Prices are high and therapy took double the estimated time. Delay in response.',
        sentiment: 'NEUTRAL',
        complaintCategory: 'Service Speed',
      },
    ],
    'super 30 academy patna': [
      {
        reviewerName: 'Alok Kumar',
        rating: 5,
        reviewText: 'Legends! Best JEE preparation coaching in India. Anand sir coaching is pure magic. 100% selection.',
        sentiment: 'POSITIVE',
        praiseCategory: 'Product Quality',
      },
      {
        reviewerName: 'Vikash Sinha',
        rating: 5,
        reviewText: 'Extremely focused education. Zero distractions and pure physics, chemistry, math concept clearances.',
        sentiment: 'POSITIVE',
        praiseCategory: 'Customer Service',
      },
    ],
    'patna science classes boring road': [
      {
        reviewerName: 'Vikram Sahay',
        rating: 4,
        reviewText: 'Decent faculty. Weekly test papers help improve performance. Infrastructure can be improved.',
        sentiment: 'POSITIVE',
        praiseCategory: 'Customer Service',
      },
      {
        reviewerName: 'Suman Roy',
        rating: 2,
        reviewText: 'Classrooms are extremely hot and suffocating in summer. AC is not working. Fee is too high.',
        sentiment: 'NEGATIVE',
        complaintCategory: 'Pricing',
      },
    ],
    'chanakya ias academy boring road': [
      {
        reviewerName: 'Divya Prakash',
        rating: 5,
        reviewText: 'Very well structured UPSC curriculum. Experienced mentors who cleared mains. Daily answer writing practice is helpful.',
        sentiment: 'POSITIVE',
        praiseCategory: 'Customer Service',
      },
      {
        reviewerName: 'Ravi Ranjan',
        rating: 2,
        reviewText: 'Fee is extremely high and batch size is 150 students. Personal guidance is impossible due to massive crowding.',
        sentiment: 'NEGATIVE',
        complaintCategory: 'Pricing',
      },
    ],
    'the bombay canteen lower parel': [
      {
        reviewerName: 'Karan Johar',
        rating: 5,
        reviewText: 'Phenomenal fusion foods! Loved the kulchas and cocktails. Superb ambiance.',
        sentiment: 'POSITIVE',
        praiseCategory: 'Product Quality',
      },
      {
        reviewerName: 'Aditi Roy',
        rating: 3,
        reviewText: 'Tasty but portions are extremely small for the pricing. Slow service during weekend evenings.',
        sentiment: 'NEUTRAL',
        complaintCategory: 'Pricing',
      },
    ],
    'bandra coffee house': [
      {
        reviewerName: 'Zoya Akhtar',
        rating: 5,
        reviewText: 'Cosy little workspace with exceptional pour over coffees. Staff is extremely polite.',
        sentiment: 'POSITIVE',
        praiseCategory: 'Customer Service',
      },
      {
        reviewerName: 'Rohan Roy',
        rating: 2,
        reviewText: 'Takes 25 mins just to serve an espresso. Staff is always busy on their phones.',
        sentiment: 'NEGATIVE',
        complaintCategory: 'Service Speed',
      },
    ],
    'patna heights cafe boring road': [
      {
        reviewerName: 'Deepak Jha',
        rating: 4,
        reviewText: 'Good location and nice music. Pizza and shakes were great value for money.',
        sentiment: 'POSITIVE',
        praiseCategory: 'Pricing',
      },
      {
        reviewerName: 'Swati Sinha',
        rating: 2,
        reviewText: 'Terrible service! Order delayed for 45 mins. When asked, waiter misbehaved. Very disappointed.',
        sentiment: 'NEGATIVE',
        complaintCategory: 'Staff Behavior',
      },
    ],
    'lodha group sales office juhu': [
      {
        reviewerName: 'Rajesh Wadhwa',
        rating: 5,
        reviewText: 'Extremely professional real estate guidance. Premium properties and clear documentation layout.',
        sentiment: 'POSITIVE',
        praiseCategory: 'Customer Service',
      },
      {
        reviewerName: 'Nisha Singhania',
        rating: 2,
        reviewText: 'Sales team commits fake promises on carpet area. Very high pricing and complex hidden charges.',
        sentiment: 'NEGATIVE',
        complaintCategory: 'Pricing',
      },
    ],
    'godrej properties sales bandra': [
      {
        reviewerName: 'Kabir Mehta',
        rating: 4,
        reviewText: 'Reliable brand and trustworthy guidance. Transparent carpet area calculations.',
        sentiment: 'POSITIVE',
        praiseCategory: 'Customer Service',
      },
      {
        reviewerName: 'Ishaan Kapoor',
        rating: 2,
        reviewText: 'Possession dates got delayed by 6 months. Customer support keeps ignoring email follow-ups.',
        sentiment: 'NEGATIVE',
        complaintCategory: 'Service Speed',
      },
    ],
  };

  constructor(
    private prisma: PrismaService,
    private messagesService: MessagesService,
    private config: ConfigService,
  ) {}

  private placesApiKey(): string | null {
    return this.config.get<string>('GOOGLE_PLACES_API_KEY')?.trim() || null;
  }

  private isProd(): boolean {
    return this.config.get<string>('NODE_ENV') === 'production';
  }

  /**
   * Discovers competitors from Google Maps (Places Text Search) when
   * GOOGLE_PLACES_API_KEY is configured. Falls back to a curated demo list
   * (clearly logged) so the feature is explorable without a key.
   */
  async searchCompetitors(query: string, category: string, location: string) {
    this.logger.log(
      `Searching competitor places: Query="${query}", Category="${category}", Location="${location}"`,
    );

    const apiKey = this.placesApiKey();
    if (apiKey) {
      try {
        return await this.searchViaGooglePlaces(apiKey, query, category, location);
      } catch (err) {
        this.logger.error(`Google Places search failed: ${(err as Error).message}`);
        if (this.isProd()) {
          throw new BadRequestException(
            'Competitor search failed. Verify GOOGLE_PLACES_API_KEY.',
          );
        }
        this.logger.warn('Falling back to demo list (non-production).');
      }
    } else if (this.isProd()) {
      // Do NOT return fabricated competitors in production.
      throw new BadRequestException(
        'Competitor discovery is not configured. Set GOOGLE_PLACES_API_KEY to enable live search.',
      );
    } else {
      this.logger.warn(
        'GOOGLE_PLACES_API_KEY not set — returning demo competitor list (non-production only).',
      );
    }

    return this.filterDemoCompetitors(query, category, location);
  }

  /**
   * Auto-discovers competitors from the business's own Marketing Brain profile
   * (industry + location) — no manual search input needed. Optionally auto-tracks
   * the top results so the analysis is populated in one click.
   *
   * Returns the discovered list (each flagged as alreadyTracked) plus, when
   * autoTrack is set, the competitors that were newly tracked.
   */
  async autoDiscover(
    workspaceId: string,
    opts?: { autoTrack?: boolean; limit?: number },
  ) {
    const profile = await this.prisma.businessProfile.findUnique({
      where: { workspaceId },
      select: { industry: true, location: true },
    });

    const category = profile?.industry?.trim() || '';
    const location = profile?.location?.trim() || '';

    if (!location && !category) {
      throw new BadRequestException(
        'Set your business industry and location in the Marketing Brain first, so competitors can be found automatically.',
      );
    }

    // Discover using the profile's industry + location (query left blank).
    const discovered = await this.searchCompetitors('', category, location);

    // Flag which are already tracked so the UI/auto-track can skip them.
    const tracked = await this.prisma.competitor.findMany({
      where: { workspaceId },
      select: { name: true },
    });
    const trackedNames = new Set(tracked.map((t) => t.name.toLowerCase()));
    const results = discovered.map((d) => ({
      ...d,
      alreadyTracked: trackedNames.has(d.name.toLowerCase()),
    }));

    let newlyTracked: Array<{ name: string }> = [];
    if (opts?.autoTrack) {
      const limit = opts.limit ?? 3;
      const toTrack = results.filter((r) => !r.alreadyTracked).slice(0, limit);
      for (const c of toTrack) {
        try {
          const created = await this.trackCompetitor(workspaceId, {
            name: c.name,
            category: c.category,
            location: c.location,
            averageRating: c.averageRating,
            totalReviews: c.totalReviews,
            placeId: (c as { placeId?: string }).placeId,
          });
          newlyTracked.push({ name: created.name });
        } catch (err) {
          this.logger.warn(`Auto-track skipped "${c.name}": ${(err as Error).message}`);
        }
      }
    }

    return {
      usedProfile: { industry: category || null, location: location || null },
      discovered: results,
      newlyTracked,
      autoTracked: opts?.autoTrack ?? false,
    };
  }

  private async searchViaGooglePlaces(
    apiKey: string,
    query: string,
    category: string,
    location: string,
  ) {
    const searchText = [query, category, location].filter(Boolean).join(' ').trim();
    const url = `${PLACES_TEXT_SEARCH}?query=${encodeURIComponent(searchText)}&key=${apiKey}`;
    const res = await fetch(url);
    const data = (await res.json()) as {
      status?: string;
      error_message?: string;
      results?: Array<{
        place_id: string;
        name: string;
        formatted_address?: string;
        rating?: number;
        user_ratings_total?: number;
        types?: string[];
      }>;
    };

    if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(data.error_message || data.status);
    }

    return (data.results || []).map((p) => ({
      placeId: p.place_id,
      name: p.name,
      category: category || (p.types?.[0] ?? 'Business'),
      location: p.formatted_address || location,
      averageRating: p.rating ?? 0,
      totalReviews: p.user_ratings_total ?? 0,
    }));
  }

  private filterDemoCompetitors(query: string, category: string, location: string) {
    const normCategory = category?.toLowerCase().trim() || '';
    const normLocation = location?.toLowerCase().trim() || '';
    const normQuery = query?.toLowerCase().trim() || '';

    let results = this.mockIndianCompetitors;
    if (normCategory) {
      results = results.filter((c) => c.category.toLowerCase() === normCategory);
    }
    if (normLocation) {
      results = results.filter((c) => c.location.toLowerCase().includes(normLocation));
    }
    if (normQuery) {
      results = results.filter((c) => c.name.toLowerCase().includes(normQuery));
    }
    return results;
  }

  /**
   * Tracks a selected discovered competitor and seeds their reviews list
   */
  async trackCompetitor(workspaceId: string, competitorData: {
    name: string;
    category: string;
    location: string;
    averageRating: number;
    totalReviews: number;
    placeId?: string;
  }) {
    // Avoid double tracking the same competitor
    const existing = await this.prisma.competitor.findFirst({
      where: {
        workspaceId,
        name: competitorData.name,
      },
    });

    if (existing) {
      throw new BadRequestException('This competitor is already being tracked.');
    }

    // Save competitor scorecard
    const competitor = await this.prisma.competitor.create({
      data: {
        workspaceId,
        name: competitorData.name,
        category: competitorData.category,
        location: competitorData.location,
        averageRating: competitorData.averageRating,
        totalReviews: competitorData.totalReviews,
      },
    });

    // Populate reviews: live via Google Place Details when possible, else demo seed.
    const apiKey = this.placesApiKey();
    let reviewsList: Array<{
      reviewerName: string;
      rating: number;
      reviewText: string;
      sentiment: string;
      complaintCategory?: string | null;
      praiseCategory?: string | null;
      reviewDate?: Date;
    }> = [];

    if (apiKey && competitorData.placeId) {
      try {
        reviewsList = await this.fetchPlaceReviews(apiKey, competitorData.placeId);
        this.logger.log(`Fetched ${reviewsList.length} live reviews for "${competitor.name}".`);
      } catch (err) {
        this.logger.error(`Live review fetch failed for "${competitor.name}": ${(err as Error).message}`);
      }
    }

    if (reviewsList.length === 0) {
      const key = competitorData.name.toLowerCase().trim();
      reviewsList = this.mockCompetitorReviews[key] || [
        {
          reviewerName: 'Amit Shah',
          rating: 4,
          reviewText: 'Good overall services and polite behavior.',
          sentiment: 'POSITIVE',
          praiseCategory: 'Customer Service',
        },
        {
          reviewerName: 'Ramesh Sharma',
          rating: 2,
          reviewText: 'Decent work but pricing is extremely high.',
          sentiment: 'NEGATIVE',
          complaintCategory: 'Pricing',
        },
      ];
      if (!apiKey) {
        this.logger.warn(
          `GOOGLE_PLACES_API_KEY not set — seeded ${reviewsList.length} demo reviews for "${competitor.name}".`,
        );
      }
    }

    for (const r of reviewsList) {
      await this.prisma.competitorReview.create({
        data: {
          competitorId: competitor.id,
          reviewerName: r.reviewerName,
          rating: r.rating,
          reviewText: r.reviewText,
          sentiment: r.sentiment,
          complaintCategory: r.complaintCategory || null,
          praiseCategory: r.praiseCategory || null,
          reviewDate: r.reviewDate ?? new Date(),
        },
      });
    }

    this.logger.log(`Tracked competitor: "${competitor.name}" with ${reviewsList.length} reviews.`);
    return competitor;
  }

  /** Fetch up to 5 reviews from the Google Place Details endpoint. */
  private async fetchPlaceReviews(apiKey: string, placeId: string) {
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
    return (data.result?.reviews || []).map((rv) => ({
      reviewerName: rv.author_name,
      rating: rv.rating,
      reviewText: rv.text,
      // Sentiment left null here; the reviews-analysis/AI pipeline classifies it.
      sentiment: rv.rating >= 4 ? 'POSITIVE' : rv.rating <= 2 ? 'NEGATIVE' : 'NEUTRAL',
      reviewDate: new Date(rv.time * 1000),
    }));
  }

  /**
   * List currently tracked competitor scorecards
   */
  async listTrackedCompetitors(workspaceId: string) {
    return this.prisma.competitor.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Untracks/deletes competitor record
   */
  async untrackCompetitor(workspaceId: string, id: string) {
    const competitor = await this.prisma.competitor.findFirst({
      where: { id, workspaceId },
    });

    if (!competitor) {
      throw new NotFoundException('Tracked competitor not found.');
    }

    await this.prisma.competitor.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Periodic competitor sync. When GOOGLE_PLACES_API_KEY is configured this
   * re-fetches live rating/review counts from Google Place Details and fires
   * alerts on real changes. Without a key it is a no-op (no fabricated data).
   *
   * NOTE: live re-fetch requires each competitor to have been discovered with
   * a placeId. Legacy/demo-seeded competitors have none and are skipped.
   */
  async runPeriodicSync(workspaceId: string) {
    this.logger.log(`Running periodic competitor sync for workspace ${workspaceId}...`);

    const apiKey = this.placesApiKey();
    if (!apiKey) {
      this.logger.warn(
        'GOOGLE_PLACES_API_KEY not set — skipping competitor sync (no live data source).',
      );
      return {
        success: true,
        competitorsSynced: 0,
        skipped: true,
        reason: 'GOOGLE_PLACES_API_KEY not configured',
        alertsTriggered: { ratingDrops: 0, reviewSpikes: 0 },
      };
    }

    const competitors = await this.prisma.competitor.findMany({ where: { workspaceId } });

    let ratingDrops = 0;
    let reviewSpikes = 0;
    let synced = 0;

    for (const comp of competitors) {
      const placeId = await this.resolvePlaceId(apiKey, comp);
      if (!placeId) continue;

      let live: { rating: number; total: number } | null = null;
      try {
        live = await this.fetchPlaceRatingSummary(apiKey, placeId);
      } catch (err) {
        this.logger.error(`Sync failed for "${comp.name}": ${(err as Error).message}`);
        continue;
      }
      if (!live) continue;

      synced++;
      const updatedRating = parseFloat(live.rating.toFixed(1));
      const reviewsGrowth = Math.max(0, live.total - comp.totalReviews);
      const ratingChanged = updatedRating !== comp.averageRating;

      if (ratingChanged || reviewsGrowth > 0) {
        await this.prisma.competitor.update({
          where: { id: comp.id },
          data: { averageRating: updatedRating, totalReviews: live.total },
        });
      }

      if (updatedRating < comp.averageRating) {
        ratingDrops++;
        this.logger.warn(`[Alert] "${comp.name}" rating dropped to ${updatedRating}`);
        await this.triggerSystemNotification(
          workspaceId,
          `⚠️ [Competitor Alert] "${comp.name}" rating dropped from ${comp.averageRating} to ${updatedRating}! Check the reviews-analysis tab.`,
        );
      }

      if (reviewsGrowth >= 3) {
        reviewSpikes++;
        this.logger.log(`[Alert] "${comp.name}" gained ${reviewsGrowth} reviews`);
        await this.triggerSystemNotification(
          workspaceId,
          `📈 [Competitor Spike] "${comp.name}" gained +${reviewsGrowth} reviews recently. They may be running promotions.`,
        );
      }
    }

    return {
      success: true,
      competitorsSynced: synced,
      alertsTriggered: { ratingDrops, reviewSpikes },
    };
  }

  /** Resolve a placeId for a tracked competitor by name+location text search. */
  private async resolvePlaceId(
    apiKey: string,
    comp: { name: string; location: string },
  ): Promise<string | null> {
    try {
      const url = `${PLACES_TEXT_SEARCH}?query=${encodeURIComponent(`${comp.name} ${comp.location}`)}&key=${apiKey}`;
      const res = await fetch(url);
      const data = (await res.json()) as {
        status?: string;
        results?: Array<{ place_id: string }>;
      };
      return data.results?.[0]?.place_id ?? null;
    } catch {
      return null;
    }
  }

  private async fetchPlaceRatingSummary(apiKey: string, placeId: string) {
    const url = `${PLACE_DETAILS}?place_id=${encodeURIComponent(placeId)}&fields=rating,user_ratings_total&key=${apiKey}`;
    const res = await fetch(url);
    const data = (await res.json()) as {
      status?: string;
      error_message?: string;
      result?: { rating?: number; user_ratings_total?: number };
    };
    if (data.status && data.status !== 'OK') {
      throw new Error(data.error_message || data.status);
    }
    return {
      rating: data.result?.rating ?? 0,
      total: data.result?.user_ratings_total ?? 0,
    };
  }

  private async triggerSystemNotification(workspaceId: string, alertText: string) {
    try {
      // Find a demo conversation in this workspace to log system alert
      const conversation = await this.prisma.conversation.findFirst({
        where: { workspaceId },
      });
      if (conversation) {
        await this.messagesService.createSystemMessage(conversation.id, alertText);
      }
    } catch {
      // skip errors
    }
  }
}
