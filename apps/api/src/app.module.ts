import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { ConversationsModule } from './conversations/conversations.module';
import { MessagesModule } from './messages/messages.module';
import { LeadsModule } from './leads/leads.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { AiModule } from './ai/ai.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { AutomationModule } from './automation/automation.module';
import { RealtimeModule } from './realtime/realtime.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { PlatformModule } from './platform/platform.module';
import { HealthModule } from './health/health.module';
import { CryptoModule } from './crypto/crypto.module';
import { QueueModule } from './queue/queue.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { ContentModule } from './content/content.module';
import { GoogleBusinessModule } from './google-business/google-business.module';
import { FeedbackModule } from './feedback/feedback.module';
import { ReviewsModule } from './reviews/reviews.module';
import { ReputationModule } from './reputation/reputation.module';
import { AIInsightsModule } from './ai-insights/ai-insights.module';
import { CompetitorModule } from './competitor/competitor.module';
import { ReviewsAnalysisModule } from './reviews-analysis/reviews-analysis.module';
import { InsightsModule } from './insights/insights.module';
import { AIRecommendationsModule } from './ai-recommendations/ai-recommendations.module';
import { ReportingModule } from './reporting/reporting.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CryptoModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    WorkspacesModule,
    ConversationsModule,
    MessagesModule,
    LeadsModule,
    DashboardModule,
    WhatsAppModule,
    AiModule,
    CampaignsModule,
    QueueModule,
    AutomationModule,
    RealtimeModule,
    SchedulerModule,
    PlatformModule,
    HealthModule,
    IntegrationsModule,
    ContentModule,
    GoogleBusinessModule,
    FeedbackModule,
    ReviewsModule,
    ReputationModule,
    AIInsightsModule,
    CompetitorModule,
    ReviewsAnalysisModule,
    InsightsModule,
    AIRecommendationsModule,
    ReportingModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
