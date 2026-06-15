import { Controller, Get, UseGuards } from '@nestjs/common';
import { ReputationService } from './reputation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClientUserGuard } from '../common/guards/client-user.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types';
import { requireWorkspaceId } from '../common/utils/workspace-id';

@Controller('reputation')
@UseGuards(JwtAuthGuard, ClientUserGuard)
export class ReputationController {
  constructor(private reputationService: ReputationService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: AuthUser) {
    const workspaceId = requireWorkspaceId(user);
    return this.reputationService.getDashboardData(workspaceId);
  }
}
