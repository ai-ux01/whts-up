import { Module, forwardRef } from '@nestjs/common';
import { ConversationsModule } from '../conversations/conversations.module';
import { MessagesModule } from '../messages/messages.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { AiService } from './ai.service';

@Module({
  imports: [
    forwardRef(() => MessagesModule),
    forwardRef(() => ConversationsModule),
    forwardRef(() => WhatsAppModule),
    RealtimeModule,
  ],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
