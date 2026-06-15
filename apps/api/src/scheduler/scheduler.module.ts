import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { QueueModule } from '../queue/queue.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [ScheduleModule.forRoot(), CampaignsModule, QueueModule, PrismaModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
