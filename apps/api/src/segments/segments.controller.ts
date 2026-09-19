import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsObject, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClientUserGuard } from '../common/guards/client-user.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types';
import { requireWorkspaceId } from '../common/utils/workspace-id';
import { SegmentsService, SegmentFilters } from './segments.service';

export class CreateSegmentDto {
  @IsString()
  name!: string;

  @IsObject()
  filters!: SegmentFilters;
}

export class PreviewSegmentDto {
  @IsObject()
  filters!: SegmentFilters;
}

@Controller('segments')
@UseGuards(JwtAuthGuard, ClientUserGuard)
export class SegmentsController {
  constructor(private segmentsService: SegmentsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.segmentsService.list(requireWorkspaceId(user));
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSegmentDto) {
    return this.segmentsService.create(requireWorkspaceId(user), dto);
  }

  @Post('preview')
  preview(@CurrentUser() user: AuthUser, @Body() dto: PreviewSegmentDto) {
    return this.segmentsService.previewSegmentCount(
      requireWorkspaceId(user),
      dto.filters,
    );
  }

  @Delete(':id')
  delete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.segmentsService.delete(requireWorkspaceId(user), id);
  }
}
