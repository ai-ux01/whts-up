import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../common/types';

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  namespace: '/',
})
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers.authorization?.replace('Bearer ', '') as string);
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwt.verify<JwtPayload>(token, {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      });
      client.data.workspaceId = payload.workspaceId;
      client.data.userId = payload.sub;
      client.join(`workspace:${payload.workspaceId}`);
      this.logger.debug(`Client joined workspace:${payload.workspaceId}`);
    } catch {
      client.disconnect();
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const workspaceId = client.data.workspaceId as string;
    if (!workspaceId || !data?.conversationId) return;
    client.to(`workspace:${workspaceId}`).emit('typing', {
      conversationId: data.conversationId,
      userId: client.data.userId,
    });
  }

  emitNewMessage(
    workspaceId: string,
    payload: { message: unknown; conversation: unknown },
  ) {
    this.server.to(`workspace:${workspaceId}`).emit('message:new', payload);
  }

  emitConversationUpdated(workspaceId: string, conversation: unknown) {
    this.server
      .to(`workspace:${workspaceId}`)
      .emit('conversation:updated', conversation);
  }

  emitMessageStatus(
    workspaceId: string,
    payload: {
      messageId: string;
      conversationId: string;
      deliveryStatus: string;
    },
  ) {
    this.server
      .to(`workspace:${workspaceId}`)
      .emit('message:status', payload);
  }
}
