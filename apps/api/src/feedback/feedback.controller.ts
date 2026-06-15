import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClientUserGuard } from '../common/guards/client-user.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types';
import { requireWorkspaceId } from '../common/utils/workspace-id';

@Controller('feedback')
export class FeedbackController {
  constructor(private feedbackService: FeedbackService) {}

  /**
   * Anonymous public endpoint for submitting feedback (from WhatsApp redirects or website widgets)
   */
  @Post(':workspaceId/submit')
  submit(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: SubmitFeedbackDto,
  ) {
    return this.feedbackService.submitFeedback(workspaceId, dto);
  }

  /**
   * Secured endpoint for listing workspace feedbacks
   */
  @Get()
  @UseGuards(JwtAuthGuard, ClientUserGuard)
  list(
    @CurrentUser() user: AuthUser,
    @Query('rating') rating?: string,
    @Query('sentiment') sentiment?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const workspaceId = requireWorkspaceId(user);
    return this.feedbackService.listFeedbacks(workspaceId, {
      rating: rating ? parseInt(rating) : undefined,
      sentiment,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  /**
   * Secured endpoint for feedback stats aggregation
   */
  @Get('stats')
  @UseGuards(JwtAuthGuard, ClientUserGuard)
  getStats(@CurrentUser() user: AuthUser) {
    const workspaceId = requireWorkspaceId(user);
    return this.feedbackService.getFeedbackStats(workspaceId);
  }

  /**
   * Secured endpoint for widget embed script generation
   */
  @Get('widget-script')
  @UseGuards(JwtAuthGuard, ClientUserGuard)
  getWidget(@CurrentUser() user: AuthUser) {
    const workspaceId = requireWorkspaceId(user);
    return this.feedbackService.getWidgetScript(workspaceId);
  }
}
