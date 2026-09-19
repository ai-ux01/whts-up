import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { GoogleOAuthService } from './google-oauth.service';
import { MetaOAuthService } from './meta-oauth.service';
import { OAuthStateService } from './oauth-state.service';
import { InstagramService } from './instagram.service';
import { SmsService } from './sms.service';
import { EmailService } from './email.service';

@Module({
  controllers: [IntegrationsController],
  providers: [
    OAuthStateService,
    MetaOAuthService,
    GoogleOAuthService,
    InstagramService,
    SmsService,
    EmailService,
  ],
  exports: [
    MetaOAuthService,
    GoogleOAuthService,
    InstagramService,
    SmsService,
    EmailService,
  ],
})
export class IntegrationsModule {}
