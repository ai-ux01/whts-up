import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AIRecommendationsService } from './ai-recommendations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClientUserGuard } from '../common/guards/client-user.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types';
import { requireWorkspaceId } from '../common/utils/workspace-id';

@Controller('competitors/recommendations')
@UseGuards(JwtAuthGuard, ClientUserGuard)
export class AIRecommendationsController {
  constructor(private recommendationsService: AIRecommendationsService) {}

  @Get('improvements')
  getImprovements(@CurrentUser() user: AuthUser) {
    const workspaceId = requireWorkspaceId(user);
    return this.recommendationsService.getImprovements(workspaceId);
  }

  @Post('improvements/generate')
  generateImprovements(@CurrentUser() user: AuthUser) {
    const workspaceId = requireWorkspaceId(user);
    return this.recommendationsService.generateImprovements(workspaceId);
  }
}
