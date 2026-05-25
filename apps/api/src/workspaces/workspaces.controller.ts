import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClientUserGuard } from '../common/guards/client-user.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthUser } from '../common/types';
import { requireWorkspaceId } from '../common/utils/workspace-id';
import { TestWhatsAppDto } from './dto/test-whatsapp.dto';
import { UpdateWorkspaceSettingsDto } from './dto/update-settings.dto';
import { WorkspacesService } from './workspaces.service';

@Controller('workspaces')
@UseGuards(JwtAuthGuard, ClientUserGuard, RolesGuard)
export class WorkspacesController {
  constructor(private workspacesService: WorkspacesService) {}

  @Get('settings')
  getSettings(@CurrentUser() user: AuthUser) {
    return this.workspacesService.getSettings(requireWorkspaceId(user));
  }

  @Patch('settings')
  @Roles(UserRole.ADMIN)
  updateSettings(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateWorkspaceSettingsDto,
  ) {
    return this.workspacesService.updateSettings(requireWorkspaceId(user), dto);
  }

  /** Push WHATSAPP_* from apps/api/.env into the workspace (fixes stale DB token). */
  @Post('settings/sync-env')
  @Roles(UserRole.ADMIN)
  syncFromEnv(@CurrentUser() user: AuthUser) {
    return this.workspacesService.syncFromEnv(requireWorkspaceId(user));
  }

  @Post('settings/test-whatsapp')
  @Roles(UserRole.ADMIN)
  testWhatsApp(@CurrentUser() user: AuthUser, @Body() dto: TestWhatsAppDto) {
    return this.workspacesService.testWhatsApp(
      requireWorkspaceId(user),
      dto.phone,
      dto.message,
    );
  }

  @Get('whatsapp/templates')
  @Roles(UserRole.ADMIN)
  listTemplates(@CurrentUser() user: AuthUser) {
    return this.workspacesService.listMessageTemplates(
      requireWorkspaceId(user),
    );
  }
}
