import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClientUserGuard } from '../common/guards/client-user.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types';
import { requireWorkspaceId } from '../common/utils/workspace-id';
import { IsNotEmpty, IsString } from 'class-validator';

class PostReplyDto {
  @IsString()
  @IsNotEmpty()
  replyText!: string;
}

@Controller('reviews')
@UseGuards(JwtAuthGuard, ClientUserGuard)
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('rating') rating?: string,
    @Query('sentiment') sentiment?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const workspaceId = requireWorkspaceId(user);
    return this.reviewsService.listReviews(workspaceId, {
      rating: rating ? parseInt(rating) : undefined,
      sentiment,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Post('sync')
  sync(@CurrentUser() user: AuthUser) {
    const workspaceId = requireWorkspaceId(user);
    return this.reviewsService.syncReviews(workspaceId);
  }

  @Post(':id/generate-reply')
  generateReply(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const workspaceId = requireWorkspaceId(user);
    return this.reviewsService.generateAiReply(workspaceId, id);
  }

  @Post(':id/reply')
  reply(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: PostReplyDto,
  ) {
    const workspaceId = requireWorkspaceId(user);
    return this.reviewsService.submitReply(workspaceId, id, dto.replyText);
  }
}
