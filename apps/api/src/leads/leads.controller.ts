import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { LeadStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClientUserGuard } from '../common/guards/client-user.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types';
import { requireWorkspaceId } from '../common/utils/workspace-id';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadsService } from './leads.service';

@Controller('leads')
@UseGuards(JwtAuthGuard, ClientUserGuard)
export class LeadsController {
  constructor(private leadsService: LeadsService) {}

  @Get('export')
  @Header('Content-Type', 'text/csv')
  exportCsv(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: LeadStatus,
    @Query('search') search?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('tag') tag?: string,
    @Query('campaign') campaign?: string,
    @Query('leadSource') leadSource?: string,
    @Res() res?: Response,
  ) {
    return this.leadsService.exportCsv(
      requireWorkspaceId(user),
      { status, search, assignedTo, tag, campaign, leadSource },
      res!,
    );
  }

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: LeadStatus,
    @Query('search') search?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('tag') tag?: string,
    @Query('campaign') campaign?: string,
    @Query('leadSource') leadSource?: string,
  ) {
    return this.leadsService.list(requireWorkspaceId(user), {
      status,
      search,
      assignedTo,
      tag,
      campaign,
      leadSource,
    });
  }

  // Declared before ':id' so these literal routes aren't captured by the param.
  @Get('pipeline')
  pipeline(@CurrentUser() user: AuthUser) {
    return this.leadsService.pipeline(requireWorkspaceId(user));
  }

  @Get('follow-ups')
  followUps(@CurrentUser() user: AuthUser) {
    return this.leadsService.followUps(requireWorkspaceId(user));
  }

  @Get(':id')
  getOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.leadsService.findOne(requireWorkspaceId(user), id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.leadsService.update(requireWorkspaceId(user), id, dto);
  }
}
