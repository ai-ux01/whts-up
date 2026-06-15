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
