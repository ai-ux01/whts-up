import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AIInsightsService } from './ai-insights.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClientUserGuard } from '../common/guards/client-user.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types';
import { requireWorkspaceId } from '../common/utils/workspace-id';

@Controller('reputation/insights')
@UseGuards(JwtAuthGuard, ClientUserGuard)
export class AIInsightsController {
  constructor(private aiInsightsService: AIInsightsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    const workspaceId = requireWorkspaceId(user);
    return this.aiInsightsService.listInsights(workspaceId);
  }

  @Post('generate')
  generate(@CurrentUser() user: AuthUser) {
    const workspaceId = requireWorkspaceId(user);
    return this.aiInsightsService.generateInsights(workspaceId);
  }
}
