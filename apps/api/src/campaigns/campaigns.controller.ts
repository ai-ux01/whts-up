import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClientUserGuard } from '../common/guards/client-user.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthUser } from '../common/types';
import { requireWorkspaceId } from '../common/utils/workspace-id';
import {
  CreateCampaignDto,
  ScheduleCampaignDto,
} from './dto/campaign.dto';
import { CampaignsService } from './campaigns.service';

@Controller('campaigns')
@UseGuards(JwtAuthGuard, ClientUserGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class CampaignsController {
  constructor(private campaignsService: CampaignsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.campaignsService.list(requireWorkspaceId(user));
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCampaignDto) {
    return this.campaignsService.create(requireWorkspaceId(user), dto);
  }

  @Get(':id')
  getOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.campaignsService.findOne(requireWorkspaceId(user), id);
  }

  @Post(':id/upload-csv')
  @UseInterceptors(FileInterceptor('file'))
  uploadCsv(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('File required');
    return this.campaignsService.uploadCsv(
      requireWorkspaceId(user),
      id,
      file.buffer,
    );
  }

  @Post(':id/schedule')
  schedule(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ScheduleCampaignDto,
  ) {
    return this.campaignsService.schedule(
      requireWorkspaceId(user),
      id,
      dto.scheduledAt,
    );
  }

  @Post(':id/send-now')
  sendNow(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.campaignsService.sendNow(requireWorkspaceId(user), id);
  }

  @Get(':id/job')
  jobStatus(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.campaignsService.getJobStatus(requireWorkspaceId(user), id);
  }
}
