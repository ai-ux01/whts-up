import {
  Controller,
  Delete,
  Get,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Response } from 'express';
import { UserRole } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClientUserGuard } from '../common/guards/client-user.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthUser } from '../common/types';
import { requireWorkspaceId } from '../common/utils/workspace-id';
import { GoogleOAuthService } from './google-oauth.service';
import { MetaOAuthService } from './meta-oauth.service';
import { OAuthStateService } from './oauth-state.service';

@Controller('integrations')
export class IntegrationsController {
  constructor(
    private config: ConfigService,
    private oauthState: OAuthStateService,
    private metaOAuth: MetaOAuthService,
    private googleOAuth: GoogleOAuthService,
  ) {}

  private frontendBase(): string {
    const origin = this.config.get<string>('CORS_ORIGIN') || 'http://localhost:3000';
    return origin.split(',')[0].trim();
  }

  private redirectToSettings(
    res: Response,
    provider: 'meta' | 'google',
    status: 'success' | 'error',
    message?: string,
  ) {
    const params = new URLSearchParams({ oauth: provider, status });
    if (message) params.set('message', message);
    res.redirect(`${this.frontendBase()}/settings?${params}`);
  }

  // --- Meta (authenticated) ---

  @Get('meta/connect-url')
  @UseGuards(JwtAuthGuard, ClientUserGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  metaConnectUrl(@CurrentUser() user: AuthUser) {
    const workspaceId = requireWorkspaceId(user);
    const state = this.oauthState.sign(workspaceId, user.id, 'meta');
    return { url: this.metaOAuth.buildAuthorizeUrl(state) };
  }

  @Get('meta/status')
  @UseGuards(JwtAuthGuard, ClientUserGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  metaStatus(@CurrentUser() user: AuthUser) {
    return this.metaOAuth.getStatus(requireWorkspaceId(user));
  }

  @Delete('meta/disconnect')
  @UseGuards(JwtAuthGuard, ClientUserGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  metaDisconnect(@CurrentUser() user: AuthUser) {
    return this.metaOAuth.disconnect(requireWorkspaceId(user));
  }

  @Get('meta/callback')
  @SkipThrottle()
  async metaCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    if (error || !code || !state) {
      return this.redirectToSettings(
        res,
        'meta',
        'error',
        error || 'Authorization cancelled',
      );
    }
    try {
      const payload = this.oauthState.verify(state, 'meta');
      const result = await this.metaOAuth.handleCallback(
        code,
        payload.workspaceId,
      );
      const msg = result.phoneNumberId
        ? `Connected. Phone ID ${result.phoneNumberId} detected.`
        : 'Connected to Meta.';
      return this.redirectToSettings(res, 'meta', 'success', msg);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Meta connect failed';
      return this.redirectToSettings(res, 'meta', 'error', message);
    }
  }

  // --- Google (authenticated) ---

  @Get('google/connect-url')
  @UseGuards(JwtAuthGuard, ClientUserGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  googleConnectUrl(@CurrentUser() user: AuthUser) {
    const workspaceId = requireWorkspaceId(user);
    const state = this.oauthState.sign(workspaceId, user.id, 'google');
    return { url: this.googleOAuth.buildAuthorizeUrl(state) };
  }

  @Get('google/status')
  @UseGuards(JwtAuthGuard, ClientUserGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  googleStatus(@CurrentUser() user: AuthUser) {
    return this.googleOAuth.getStatus(requireWorkspaceId(user));
  }

  @Delete('google/disconnect')
  @UseGuards(JwtAuthGuard, ClientUserGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  googleDisconnect(@CurrentUser() user: AuthUser) {
    return this.googleOAuth.disconnect(requireWorkspaceId(user));
  }

  @Get('google/callback')
  @SkipThrottle()
  async googleCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    if (error || !code || !state) {
      return this.redirectToSettings(
        res,
        'google',
        'error',
        error || 'Authorization cancelled',
      );
    }
    try {
      const payload = this.oauthState.verify(state, 'google');
      const result = await this.googleOAuth.handleCallback(
        code,
        payload.workspaceId,
      );
      const msg = result.customerId
        ? `Connected. Customer ID ${result.customerId}.`
        : result.customerListError || 'Connected to Google.';
      return this.redirectToSettings(res, 'google', 'success', msg);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Google connect failed';
      return this.redirectToSettings(res, 'google', 'error', message);
    }
  }
}
