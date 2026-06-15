import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { CryptoModule } from '../crypto/crypto.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { SupabaseStorageService } from './supabase-storage.service';

@Module({
  imports: [PrismaModule, AiModule, CryptoModule, IntegrationsModule],
  controllers: [ContentController],
  providers: [ContentService, SupabaseStorageService],
  exports: [ContentService, SupabaseStorageService],
})
export class ContentModule {}
