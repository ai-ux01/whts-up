import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClientUserGuard } from '../common/guards/client-user.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types';
import { requireWorkspaceId } from '../common/utils/workspace-id';
import { forwardRef, Inject } from '@nestjs/common';
import { SendMessageDto } from './dto/send-message.dto';
import { MessagesService } from './messages.service';
import { AiService } from '../ai/ai.service';

@Controller('conversations/:conversationId/messages')
@UseGuards(JwtAuthGuard, ClientUserGuard)
export class MessagesController {
  constructor(
    private messagesService: MessagesService,
    @Inject(forwardRef(() => AiService))
    private aiService: AiService,
  ) {}

  @Post('suggest-reply')
  suggestReply(
    @CurrentUser() user: AuthUser,
    @Param('conversationId') conversationId: string,
  ) {
    return this.aiService.suggestReply(
      requireWorkspaceId(user),
      conversationId,
    );
  }

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Param('conversationId') conversationId: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.messagesService.listMessages(
      requireWorkspaceId(user),
      conversationId,
      cursor,
    );
  }

  @Post()
  send(
    @CurrentUser() user: AuthUser,
    @Param('conversationId') conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagesService.sendAgentMessage(
      user,
      conversationId,
      dto.content,
      dto.forceSend,
    );
  }
}
