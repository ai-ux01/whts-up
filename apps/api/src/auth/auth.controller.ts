import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto, SignupDto } from './dto/auth.dto';
import {
  REFRESH_COOKIE,
  clearRefreshCookie,
  readCookie,
  setRefreshCookie,
} from './auth-cookie';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
  ) {}

  private isProd(): boolean {
    return this.config.get<string>('NODE_ENV') === 'production';
  }

  /**
   * Sets the refresh token as an httpOnly cookie and returns everything EXCEPT
   * the refresh token in the JSON body — so it is never accessible to JS/XSS.
   */
  private respondWithAuth(
    res: Response,
    result: {
      accessToken: string;
      refreshToken: string;
      user: { portal?: string } & Record<string, unknown>;
    },
  ) {
    const portal = result.user?.portal === 'platform' ? 'platform' : 'client';
    setRefreshCookie(res, result.refreshToken, this.isProd(), portal);
    return res.json({ accessToken: result.accessToken, user: result.user });
  }

  @Post('signup')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async signup(@Body() dto: SignupDto, @Res() res: Response) {
    return this.respondWithAuth(res, await this.authService.signup(dto));
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async login(@Body() dto: LoginDto, @Res() res: Response) {
    return this.respondWithAuth(res, await this.authService.login(dto));
  }

  @Post('admin/login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async adminLogin(@Body() dto: LoginDto, @Res() res: Response) {
    return this.respondWithAuth(res, await this.authService.adminLogin(dto));
  }

  @Post('refresh')
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Prefer the httpOnly cookie; fall back to the body for non-browser clients.
    const token = readCookie(req, REFRESH_COOKIE) || dto.refreshToken;
    if (!token) throw new UnauthorizedException('Missing refresh token');
    return this.respondWithAuth(res, await this.authService.refresh(token));
  }

  @Post('logout')
  logout(@Res() res: Response) {
    clearRefreshCookie(res, this.isProd());
    return res.json({ success: true });
  }
}
