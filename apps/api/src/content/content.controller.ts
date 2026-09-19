import { Controller, Get, Post, Delete, Body, Query, UseGuards, Param, Patch, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClientUserGuard } from '../common/guards/client-user.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types';
import { requireWorkspaceId } from '../common/utils/workspace-id';
import { ContentService } from './content.service';
import {
  ConnectSocialAccountDto,
  CreateReelDto,
  GenerateContentDto,
  GenerateIdeasDto,
  GenerateResearchDto,
  SchedulePostDto,
  UpdateBrandKitDto,
  UploadMediaMetaDto,
} from './dto/content.dto';

interface UploadedFileLike {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

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
  updateBrandKit(@CurrentUser() user: AuthUser, @Body() body: UpdateBrandKitDto) {
    return this.contentService.updateBrandKit(requireWorkspaceId(user), body);
  }

  // ==========================================
  // AI CONTENT STUDIO ENDPOINTS
  // ==========================================

  @Post('studio/generate')
  generateContent(@CurrentUser() user: AuthUser, @Body() body: GenerateContentDto) {
    return this.contentService.generateContent(requireWorkspaceId(user), body);
  }

  @Post('ideas/generate')
  generateIdeas(@CurrentUser() user: AuthUser, @Body() body: GenerateIdeasDto) {
    return this.contentService.generateIdeas(requireWorkspaceId(user), body);
  }

  // ==========================================
  // REEL STORYBOARD CREATOR ENDPOINTS
  // ==========================================

  @Post('reels')
  createReelProject(@CurrentUser() user: AuthUser, @Body() body: CreateReelDto) {
    return this.contentService.createReelProject(requireWorkspaceId(user), body);
  }

  @Get('reels')
  getReelProjects(@CurrentUser() user: AuthUser) {
    return this.contentService.getReelProjects(requireWorkspaceId(user));
  }

  @Post('reels/:id/render')
  renderReel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    // Scope render to the caller's workspace to prevent cross-tenant triggering.
    return this.contentService.renderReel(requireWorkspaceId(user), id);
  }

  // ==========================================
  // MEDIA LIBRARY STORAGE ENDPOINTS
  // ==========================================

  @Get('media')
  getMediaAssets(@CurrentUser() user: AuthUser, @Query('folder') folder?: string) {
    return this.contentService.getMediaAssets(requireWorkspaceId(user), folder);
  }

  @Post('media')
  @UseInterceptors(FileInterceptor('file'))
  uploadMediaAsset(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file?: UploadedFileLike,
    // Multipart form fields are not validated by the global pipe; parsed leniently.
    @Body() body?: UploadMediaMetaDto,
  ) {
    const workspaceId = requireWorkspaceId(user);
    if (file) {
      const folder = body?.folder || 'General';
      return this.contentService.uploadMediaAsset(workspaceId, file, folder);
    }
    return this.contentService.uploadMediaAsset(workspaceId, body);
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
  schedulePost(@CurrentUser() user: AuthUser, @Body() body: SchedulePostDto) {
    return this.contentService.schedulePost(requireWorkspaceId(user), body);
  }

  @Get('social-accounts')
  getSocialAccounts(@CurrentUser() user: AuthUser) {
    return this.contentService.getSocialAccounts(requireWorkspaceId(user));
  }

  @Post('social-accounts')
  connectSocialAccount(
    @CurrentUser() user: AuthUser,
    @Body() body: ConnectSocialAccountDto,
  ) {
    return this.contentService.connectSocialAccount(requireWorkspaceId(user), body);
  }

  // ==========================================
  // PLATFORM SOCIAL ANALYTICS ENDPOINTS
  // ==========================================

  @Get('analytics')
  getPlatformAnalytics(@CurrentUser() user: AuthUser) {
    return this.contentService.getPlatformAnalytics(requireWorkspaceId(user));
  }

  // ==========================================
  // AI RESEARCH ENGINE ENDPOINTS
  // ==========================================

  @Post('research')
  generateResearch(@CurrentUser() user: AuthUser, @Body() body: GenerateResearchDto) {
    return this.contentService.generateResearch(requireWorkspaceId(user), body);
  }

  @Get('research')
  getResearchHistory(@CurrentUser() user: AuthUser) {
    return this.contentService.getResearchHistory(requireWorkspaceId(user));
  }

  @Delete('research/:id')
  deleteResearch(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.contentService.deleteResearch(requireWorkspaceId(user), id);
  }
}
