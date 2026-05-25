import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { GoogleOAuthService } from './google-oauth.service';
import { MetaOAuthService } from './meta-oauth.service';
import { OAuthStateService } from './oauth-state.service';

@Module({
  controllers: [IntegrationsController],
  providers: [OAuthStateService, MetaOAuthService, GoogleOAuthService],
  exports: [MetaOAuthService, GoogleOAuthService],
})
export class IntegrationsModule {}
