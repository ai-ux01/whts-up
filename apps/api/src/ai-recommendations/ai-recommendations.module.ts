import { Module } from '@nestjs/common';
import { AIRecommendationsService } from './ai-recommendations.service';
import { AIRecommendationsController } from './ai-recommendations.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [AIRecommendationsController],
  providers: [AIRecommendationsService],
  exports: [AIRecommendationsService],
})
export class AIRecommendationsModule {}
