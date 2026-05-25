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
import { SendMessageDto } from './dto/send-message.dto';
import { MessagesService } from './messages.service';

@Controller('conversations/:conversationId/messages')
@UseGuards(JwtAuthGuard, ClientUserGuard)
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

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
