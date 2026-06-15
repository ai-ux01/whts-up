import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClientUserGuard } from '../common/guards/client-user.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthUser } from '../common/types';
import { requireWorkspaceId } from '../common/utils/workspace-id';
import { CreateAutomationDto } from './dto/automation.dto';
import { AutomationService } from './automation.service';

@Controller('automations')
@UseGuards(JwtAuthGuard, ClientUserGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AutomationController {
  constructor(private automationService: AutomationService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.automationService.list(requireWorkspaceId(user));
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAutomationDto) {
    return this.automationService.create(requireWorkspaceId(user), dto);
  }

  @Post('trigger-service-completed')
  triggerServiceCompleted(
    @CurrentUser() user: AuthUser,
    @Body() dto: { contactId: string; customerPhone: string; customerName: string },
  ) {
    const workspaceId = requireWorkspaceId(user);
    return this.automationService.handleServiceCompleted(
      workspaceId,
      dto.contactId,
      dto.customerPhone,
      dto.customerName,
    );
  }
}
