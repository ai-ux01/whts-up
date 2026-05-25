import { Module, forwardRef } from '@nestjs/common';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { QueueModule } from '../queue/queue.module';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';

@Module({
  imports: [WhatsAppModule, forwardRef(() => QueueModule)],
  controllers: [CampaignsController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
