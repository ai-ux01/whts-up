import { Module, forwardRef } from '@nestjs/common';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { AutomationModule } from '../automation/automation.module';
import { QueueService } from './queue.service';

@Module({
  imports: [
    forwardRef(() => CampaignsModule),
    forwardRef(() => AutomationModule),
  ],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
