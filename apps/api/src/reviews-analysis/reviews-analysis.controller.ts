import { Controller, Get, UseGuards } from '@nestjs/common';
import { ReviewsAnalysisService } from './reviews-analysis.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClientUserGuard } from '../common/guards/client-user.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types';
import { requireWorkspaceId } from '../common/utils/workspace-id';

@Controller('reviews-analysis')
@UseGuards(JwtAuthGuard, ClientUserGuard)
export class ReviewsAnalysisController {
  constructor(private reviewsAnalysisService: ReviewsAnalysisService) {}

  @Get('compare')
  compare(@CurrentUser() user: AuthUser) {
    const workspaceId = requireWorkspaceId(user);
    return this.reviewsAnalysisService.getComparisonData(workspaceId);
  }
}
