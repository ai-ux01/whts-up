import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { CryptoModule } from '../crypto/crypto.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { QueueModule } from '../queue/queue.module';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { SupabaseStorageService } from './supabase-storage.service';
import { ReelRenderService } from './reel-render.service';
import { BusinessProfileService } from './business-profile.service';
import { CampaignEngineService } from './campaign-engine.service';

@Module({
  imports: [
    PrismaModule,
    AiModule,
    CryptoModule,
    IntegrationsModule,
    forwardRef(() => QueueModule),
  ],
  controllers: [ContentController],
  providers: [
    ContentService,
    SupabaseStorageService,
    ReelRenderService,
    BusinessProfileService,
    CampaignEngineService,
  ],
  exports: [
    ContentService,
    SupabaseStorageService,
    ReelRenderService,
    BusinessProfileService,
    CampaignEngineService,
  ],
})
export class ContentModule {}
