import { Controller, Get, Post, Delete, Body, Query, UseGuards, Param, Patch } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClientUserGuard } from '../common/guards/client-user.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types';
import { requireWorkspaceId } from '../common/utils/workspace-id';
import { ContentService } from './content.service';

@Controller('content')
@UseGuards(JwtAuthGuard, ClientUserGuard)
export class ContentController {
  constructor(private contentService: ContentService) {}

  // ==========================================
  // BRAND KIT ENDPOINTS
  // ==========================================

  @Get('brand-kit')
  getBrandKit(@CurrentUser() user: AuthUser) {
    return this.contentService.getBrandKit(requireWorkspaceId(user));
  }

  @Patch('brand-kit')
  updateBrandKit(@CurrentUser() user: AuthUser, @Body() body: any) {
    return this.contentService.updateBrandKit(requireWorkspaceId(user), body);
  }

  // ==========================================
  // AI CONTENT STUDIO ENDPOINTS
  // ==========================================

  @Post('studio/generate')
  generateContent(@CurrentUser() user: AuthUser, @Body() body: { type: string; topic: string; tone?: string; language?: string }) {
    return this.contentService.generateContent(requireWorkspaceId(user), body);
  }

  @Post('ideas/generate')
  generateIdeas(@CurrentUser() user: AuthUser, @Body() body: { niche: string }) {
    return this.contentService.generateIdeas(requireWorkspaceId(user), body);
  }

  // ==========================================
  // REEL STORYBOARD CREATOR ENDPOINTS
  // ==========================================

  @Post('reels')
  createReelProject(@CurrentUser() user: AuthUser, @Body() body: { title: string; niche: string; offer: string; voiceId?: string }) {
    return this.contentService.createReelProject(requireWorkspaceId(user), body);
  }

  @Get('reels')
  getReelProjects(@CurrentUser() user: AuthUser) {
    return this.contentService.getReelProjects(requireWorkspaceId(user));
  }

  @Post('reels/:id/render')
  renderReel(@Param('id') id: string) {
    return this.contentService.renderReel(id);
  }

  // ==========================================
  // MEDIA LIBRARY STORAGE ENDPOINTS
  // ==========================================

  @Get('media')
  getMediaAssets(@CurrentUser() user: AuthUser, @Query('folder') folder?: string) {
    return this.contentService.getMediaAssets(requireWorkspaceId(user), folder);
  }

  @Post('media')
  uploadMediaAsset(@CurrentUser() user: AuthUser, @Body() body: { name: string; url: string; type: string; size?: number; folder?: string }) {
    return this.contentService.uploadMediaAsset(requireWorkspaceId(user), body);
  }

  @Delete('media/:id')
  deleteMediaAsset(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.contentService.deleteMediaAsset(requireWorkspaceId(user), id);
  }

  // ==========================================
  // CONTENT CALENDAR SCHEDULER ENDPOINTS
  // ==========================================

  @Get('calendar')
  getScheduledPosts(@CurrentUser() user: AuthUser) {
    return this.contentService.getScheduledPosts(requireWorkspaceId(user));
  }

  @Post('calendar')
  schedulePost(@CurrentUser() user: AuthUser, @Body() body: { title: string; content: string; scheduledAt: string; platform: string }) {
    return this.contentService.schedulePost(requireWorkspaceId(user), body);
  }

  @Get('social-accounts')
  getSocialAccounts(@CurrentUser() user: AuthUser) {
    return this.contentService.getSocialAccounts(requireWorkspaceId(user));
  }

  // ==========================================
  // PLATFORM SOCIAL ANALYTICS ENDPOINTS
  // ==========================================

  @Get('analytics')
  getPlatformAnalytics(@CurrentUser() user: AuthUser) {
    return this.contentService.getPlatformAnalytics(requireWorkspaceId(user));
  }
}
