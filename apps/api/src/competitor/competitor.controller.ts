import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CompetitorService } from './competitor.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClientUserGuard } from '../common/guards/client-user.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types';
import { requireWorkspaceId } from '../common/utils/workspace-id';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

class TrackCompetitorDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsString()
  @IsNotEmpty()
  location!: string;

  @IsNumber()
  averageRating!: number;

  @IsNumber()
  totalReviews!: number;
}

@Controller('competitors')
@UseGuards(JwtAuthGuard, ClientUserGuard)
export class CompetitorController {
  constructor(private competitorService: CompetitorService) {}

  @Get('search')
  search(
    @Query('query') query?: string,
    @Query('category') category?: string,
    @Query('location') location?: string,
  ) {
    return this.competitorService.searchCompetitors(
      query || '',
      category || '',
      location || '',
    );
  }

  /**
   * Auto-discover competitors from the business's own industry + location
   * (Marketing Brain). Pass ?autoTrack=true to also start tracking the top few.
   */
  @Post('auto-discover')
  autoDiscover(
    @CurrentUser() user: AuthUser,
    @Query('autoTrack') autoTrack?: string,
    @Query('limit') limit?: string,
  ) {
    const workspaceId = requireWorkspaceId(user);
    return this.competitorService.autoDiscover(workspaceId, {
      autoTrack: autoTrack === 'true',
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post('track')
  track(@CurrentUser() user: AuthUser, @Body() dto: TrackCompetitorDto) {
    const workspaceId = requireWorkspaceId(user);
    return this.competitorService.trackCompetitor(workspaceId, dto);
  }

  @Get('tracked')
  listTracked(@CurrentUser() user: AuthUser) {
    const workspaceId = requireWorkspaceId(user);
    return this.competitorService.listTrackedCompetitors(workspaceId);
  }

  @Post('sync')
  sync(@CurrentUser() user: AuthUser) {
    const workspaceId = requireWorkspaceId(user);
    return this.competitorService.runPeriodicSync(workspaceId);
  }

  @Delete('track/:id')
  untrack(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const workspaceId = requireWorkspaceId(user);
    return this.competitorService.untrackCompetitor(workspaceId, id);
  }
}
