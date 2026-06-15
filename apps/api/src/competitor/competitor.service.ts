import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessagesService } from '../messages/messages.service';

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
  ) {}

  /**
   * Discovers competitors from Google Maps using keyword details
   */
  async searchCompetitors(query: string, category: string, location: string) {
    this.logger.log(`Searching competitor places: Query="${query}", Category="${category}", Location="${location}"`);

    // Normalized filters
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

    // Seed customer reviews in database
    const key = competitorData.name.toLowerCase().trim();
    const reviewsList = this.mockCompetitorReviews[key] || [
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
          reviewDate: new Date(Date.now() - Math.floor(Math.random() * 10) * 24 * 3600 * 1000),
        },
      });
    }

    this.logger.log(`Tracked competitor: "${competitor.name}" and seeded ${reviewsList.length} reviews.`);
    return competitor;
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
   * Simulated Periodic Reviews Syncer:
   * Syncs and updates tracked competitors, evaluates score drops or alert anomalies
   */
  async runPeriodicSync(workspaceId: string) {
    this.logger.log(`Running periodic reviews scraper sync for workspace ${workspaceId}...`);
    const competitors = await this.prisma.competitor.findMany({
      where: { workspaceId },
    });

    let ratingDrops = 0;
    let reviewSpikes = 0;

    for (const comp of competitors) {
      // Simulate minor updates in metrics
      const newRatingShift = Math.random() > 0.7 ? -0.3 : Math.random() > 0.8 ? 0.2 : 0;
      const reviewsGrowth = Math.floor(Math.random() * 5);

      if (newRatingShift !== 0 || reviewsGrowth > 0) {
        const updatedRating = Math.max(1.0, Math.min(5.0, parseFloat((comp.averageRating + newRatingShift).toFixed(1))));
        const updatedReviewsCount = comp.totalReviews + reviewsGrowth;

        await this.prisma.competitor.update({
          where: { id: comp.id },
          data: {
            averageRating: updatedRating,
            totalReviews: updatedReviewsCount,
          },
        });

        // Trigger automations: Competitor Rating Drops
        if (newRatingShift < 0) {
          ratingDrops++;
          this.logger.warn(`[Alert] Tracked competitor "${comp.name}" rating dropped to ${updatedRating}!`);
          await this.triggerSystemNotification(
            workspaceId,
            `⚠️ [Competitor Alert] "${comp.name}" rating dropped from ${comp.averageRating} to ${updatedRating}! Check reviews-analysis tab to see what failed.`,
          );
        }

        // Trigger automations: Review Spikes Alert
        if (reviewsGrowth >= 3) {
          reviewSpikes++;
          this.logger.log(`[Alert] Tracked competitor "${comp.name}" is gaining reviews rapidly!`);
          await this.triggerSystemNotification(
            workspaceId,
            `📈 [Competitor Spike] "${comp.name}" gained +${reviewsGrowth} reviews rapidly this week! They might be running promotions.`,
          );
        }
      }
    }

    return {
      success: true,
      competitorsSynced: competitors.length,
      alertsTriggered: { ratingDrops, reviewSpikes },
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
