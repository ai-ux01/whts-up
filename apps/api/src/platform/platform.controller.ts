import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { CreateClientWorkspaceDto } from './dto/create-client-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { PlatformService } from './platform.service';

@Controller('platform')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class PlatformController {
  constructor(private platformService: PlatformService) {}

  @Get('workspaces')
  listWorkspaces() {
    return this.platformService.listWorkspaces();
  }

  @Get('workspaces/:id')
  getWorkspace(@Param('id') id: string) {
    return this.platformService.getWorkspace(id);
  }

  @Post('workspaces')
  createWorkspace(@Body() dto: CreateClientWorkspaceDto) {
    return this.platformService.createClientWorkspace(dto);
  }

  @Patch('workspaces/:id')
  updateWorkspace(@Param('id') id: string, @Body() dto: UpdateWorkspaceDto) {
    return this.platformService.updateWorkspace(id, dto);
  }
}
