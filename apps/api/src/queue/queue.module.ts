import { Module, forwardRef } from '@nestjs/common';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { AutomationModule } from '../automation/automation.module';
import { ContentModule } from '../content/content.module';
import { QueueService } from './queue.service';

@Module({
  imports: [
    forwardRef(() => CampaignsModule),
    forwardRef(() => AutomationModule),
    forwardRef(() => ContentModule),
  ],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
