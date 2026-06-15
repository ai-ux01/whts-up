import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { InsightsService } from './insights.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClientUserGuard } from '../common/guards/client-user.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types';
import { requireWorkspaceId } from '../common/utils/workspace-id';

@Controller('competitors/insights')
@UseGuards(JwtAuthGuard, ClientUserGuard)
export class InsightsController {
  constructor(private insightsService: InsightsService) {}

  @Get('market-gaps')
  getMarketGaps(@CurrentUser() user: AuthUser) {
    const workspaceId = requireWorkspaceId(user);
    return this.insightsService.getMarketGaps(workspaceId);
  }

  @Post('market-gaps/regenerate')
  regenerateMarketGaps(@CurrentUser() user: AuthUser) {
    const workspaceId = requireWorkspaceId(user);
    return this.insightsService.generateMarketGaps(workspaceId);
  }

  @Post('swot')
  getSwot(@CurrentUser() user: AuthUser) {
    const workspaceId = requireWorkspaceId(user);
    return this.insightsService.generateSwot(workspaceId);
  }
}
