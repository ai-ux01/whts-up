import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClientUserGuard } from '../common/guards/client-user.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types';
import { requireWorkspaceId } from '../common/utils/workspace-id';
import { DashboardService } from './dashboard.service';
import { CommandCenterService } from './command-center.service';
import { IntelligenceService } from './intelligence.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, ClientUserGuard)
export class DashboardController {
  constructor(
    private dashboardService: DashboardService,
    private commandCenterService: CommandCenterService,
    private intelligenceService: IntelligenceService,
  ) {}

  @Get('stats')
  getStats(@CurrentUser() user: AuthUser) {
    return this.dashboardService.getStats(requireWorkspaceId(user));
  }

  /** Phase 1 — Command Center: KPIs + pipeline + auto-derived Today's Actions. */
  @Get('command-center')
  getCommandCenter(@CurrentUser() user: AuthUser) {
    return this.commandCenterService.getOverview(requireWorkspaceId(user));
  }

  /** Phase 5 — Intelligence: acquisition, conversion, economics, content. */
  @Get('intelligence')
  getIntelligence(@CurrentUser() user: AuthUser) {
    return this.intelligenceService.getAnalytics(requireWorkspaceId(user));
  }

  @Get('intelligence/interpret')
  interpretIntelligence(@CurrentUser() user: AuthUser) {
    return this.intelligenceService.interpret(requireWorkspaceId(user));
  }
}
