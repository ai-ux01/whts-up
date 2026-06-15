import { Module } from '@nestjs/common';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { PrismaModule } from '../prisma/prisma.module';
import { GoogleBusinessModule } from '../google-business/google-business.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [PrismaModule, GoogleBusinessModule, AiModule],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
