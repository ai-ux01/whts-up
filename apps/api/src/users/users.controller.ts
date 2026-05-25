import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClientUserGuard } from '../common/guards/client-user.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthUser } from '../common/types';
import { requireWorkspaceId } from '../common/utils/workspace-id';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, ClientUserGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: AuthUser) {
    return this.usersService.getMe(user.id);
  }

  @Get('agents')
  listAgents(@CurrentUser() user: AuthUser) {
    return this.usersService.listAgents(requireWorkspaceId(user));
  }

  @Post('agents')
  @Roles(UserRole.ADMIN)
  createAgent(@CurrentUser() user: AuthUser, @Body() dto: CreateAgentDto) {
    return this.usersService.createAgent(user, dto);
  }
}
