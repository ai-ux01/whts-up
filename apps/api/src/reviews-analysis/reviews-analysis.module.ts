import { Module } from '@nestjs/common';
import { ReviewsAnalysisController } from './reviews-analysis.controller';
import { ReviewsAnalysisService } from './reviews-analysis.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ReviewsAnalysisController],
  providers: [ReviewsAnalysisService],
  exports: [ReviewsAnalysisService],
})
export class ReviewsAnalysisModule {}
