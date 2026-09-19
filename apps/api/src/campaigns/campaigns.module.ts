import { Module, forwardRef } from '@nestjs/common';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { QueueModule } from '../queue/queue.module';
import { SegmentsModule } from '../segments/segments.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';

@Module({
  imports: [
    WhatsAppModule,
    SegmentsModule,
    forwardRef(() => QueueModule),
    IntegrationsModule,
  ],
  controllers: [CampaignsController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
