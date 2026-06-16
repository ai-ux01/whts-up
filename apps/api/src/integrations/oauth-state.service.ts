import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export type OAuthProvider = 'meta' | 'google';

export interface OAuthStatePayload {
  workspaceId: string;
  userId: string;
  provider: OAuthProvider;
  exp: number;
  origin?: string;
}

@Injectable()
export class OAuthStateService {
  constructor(private config: ConfigService) {}

  private secret(): string {
    return (
      this.config.get<string>('OAUTH_STATE_SECRET') ||
      this.config.getOrThrow<string>('JWT_ACCESS_SECRET')
    );
  }

  sign(workspaceId: string, userId: string, provider: OAuthProvider, origin?: string): string {
    const payload: OAuthStatePayload = {
      workspaceId,
      userId,
      provider,
      exp: Date.now() + 10 * 60 * 1000,
      origin,
    };
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = crypto
      .createHmac('sha256', this.secret())
      .update(body)
      .digest('base64url');
    return `${body}.${sig}`;
  }

  verify(state: string, provider: OAuthProvider): OAuthStatePayload {
    const [body, sig] = state.split('.');
    if (!body || !sig) throw new UnauthorizedException('Invalid OAuth state');
    const expected = crypto
      .createHmac('sha256', this.secret())
      .update(body)
      .digest('base64url');
    if (sig.length !== expected.length) {
      throw new UnauthorizedException('Invalid OAuth state signature');
    }
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      throw new UnauthorizedException('Invalid OAuth state signature');
    }
    const payload = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8'),
    ) as OAuthStatePayload;
    if (payload.provider !== provider) {
      throw new UnauthorizedException('OAuth provider mismatch');
    }
    if (payload.exp < Date.now()) {
      throw new UnauthorizedException('OAuth state expired');
    }
    return payload;
  }
}
