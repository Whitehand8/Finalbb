// src/chat/chat.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { CreateChatMessagesDto } from './dto/create-chat-messages.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { jwtValidatedOutputDto } from '@/auth/types/jwt-payload.dto';
import { WsAuthMiddleware } from '@/auth/ws-auth.middleware';
import { CHAT_ERRORS } from './constant/chat.constant';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway(11123, {
  namespace: '/chat',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // ✅ NEW: 현재 방에 접속한 사용자 상태를 저장하는 맵
  // key: roomId, value: Set<userId>
  private readonly connectedUsers = new Map<number, Set<number>>();

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    private readonly chatService: ChatService,
    private readonly wsAuthMiddleware: WsAuthMiddleware,
  ) {}

  afterInit(server: Server) {
    server.use(this.wsAuthMiddleware.createMiddleware());
  }

  handleConnection(client: Socket) {
    const user = client.data.user as jwtValidatedOutputDto;
    console.log(
      `✅ Authenticated client connected: ${client.id}, User: ${user.email}`,
    );
  }

  handleDisconnect(client: Socket) {
    const user = client.data.user as jwtValidatedOutputDto;
    console.log(`Client disconnected: ${client.id}, User: ${user.email}`);

    // ✅ NEW: 연결 해제 시 모든 방에서 접속 상태 제거
    for (const [roomId, userSet] of this.connectedUsers.entries()) {
      userSet.delete(user.id);
      if (userSet.size === 0) {
        this.connectedUsers.delete(roomId);
      }
    }
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @MessageBody() data: { roomId: number },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const user = client.data.user as jwtValidatedOutputDto;
    const userId = user.id;
    const roomId = data.roomId;

    try {
      // ✅ 1. 권한 체크 (기존)
      // await this.chatService.checkUserCanAccessRoom(userId, roomId);

      // ✅ 2. NEW: 방에 접속 중인 사용자 목록에 추가
      if (!this.connectedUsers.has(roomId)) {
        this.connectedUsers.set(roomId, new Set());
      }
      this.connectedUsers.get(roomId)!.add(userId);

      console.log(`[DEBUG] User ${userId} ADDED to connectedUsers for room ${roomId}`);

      // ✅ 3. Socket.IO 방에 참여
      client.join(`room-${roomId}`);
      client.emit('joinedRoom', { roomId });
      console.log(`User ${userId} joined room ${roomId}`);
    } catch (error) {
      // 🔽🔽🔽 [디버그 2] 만약 실패하면, 어떤 오류인지 확인해 주세요 🔽🔽🔽
      console.error(
        `[DEBUG] handleJoinRoom FAILED for user ${userId} in room ${roomId}:`,
        error.message,
      );
      // 🔼🔼🔼 [디버그 2] 🔼🔼🔼
      client.emit('error', { message: 'Cannot join room: ' + error.message });
      return;
    }
  }

  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(
    @MessageBody() data: { roomId: number },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const user = client.data.user as jwtValidatedOutputDto;
    const roomId = data.roomId;

    // ✅ NEW: 접속 상태에서 제거
    const userSet = this.connectedUsers.get(roomId);
    if (userSet) {
      userSet.delete(user.id);
      if (userSet.size === 0) {
        this.connectedUsers.delete(roomId);
      }
    }

    client.leave(`room-${roomId}`);
    client.emit('leftRoom', { roomId });
    console.log(`User ${user.id} left room ${roomId}`);
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() createMessagesDto: CreateChatMessagesDto,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    try {
      const user = client.data.user as jwtValidatedOutputDto;
      const userId = user.id;
      const roomId = createMessagesDto.roomId;

      // ✅ 1. 권한 체크 (기존)
      // await this.chatService.checkUserCanAccessRoom(userId, roomId);

      // ✅ 2. NEW: 접속 상태 체크 — 이 부분이 핵심!
      const isCurrentlyInRoom = this.connectedUsers.get(roomId)?.has(userId);
      if (!isCurrentlyInRoom) {
        client.emit('error', { message: CHAT_ERRORS.INVALID_PARTICIPANT });
        return; // ✅ 여기서 종료
      }

      // ✅ 3. 메시지 저장
      const savedMessages: MessageResponseDto[] =
        await this.chatService.createMessages(userId, createMessagesDto);

      // ✅ 4. 방에 메시지 브로드캐스트
      this.server
        .to(`room-${createMessagesDto.roomId}`)
        .emit('newMessage', savedMessages[0]);
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }
}
