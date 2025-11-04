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
import { AuthService } from '@/auth/auth.service';

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
    private readonly authService: AuthService,
  ) {}

  afterInit(server: Server) {
    server.use(this.wsAuthMiddleware.createMiddleware());
  }

  handleConnection(client: Socket) {
    try {

      if (!client.data || !client.data.user) {
        console.error('[GATEWAY ERROR] handleConnection: User data is missing after middleware.');
        // 인증 미들웨어는 통과했지만 데이터가 없는 비정상적인 경우입니다.
        client.emit('error', { message: 'Authentication data missing.' });
        client.disconnect(true);
        return; 
      }

      const user = client.data.user as jwtValidatedOutputDto;
      console.log(
        `✅ Authenticated client connected: ${client.id}, User: ${user.email}`,
      );

      // --- 🔽 [추가] Room ID가 즉시 필요하다면 여기서 joinRoom을 시도합니다. (선택적)
      // 이전에 front에서 joinRoom을 호출했지만, 테스트로 여기서 다시 호출해 봅니다.
      // client.emit('joinRoom', { roomId: SOME_ROOM_ID }); // <-- 이 코드는 ChatService가 하니 생략
      // --- 🔼
      
    } catch (error) {
      console.error('[GATEWAY ERROR] handleConnection failed:', error); 
      // 클라이언트에 오류 메시지 전송 후 연결 종료 (강제 에러 로깅)
      client.emit('error', { message: 'Internal Server Error during connection setup' });
      client.disconnect(true);
    }
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
      await this.chatService.checkUserCanAccessRoom(userId, roomId);

      // ✅ 2. NEW: 방에 접속 중인 사용자 목록에 추가
      if (!this.connectedUsers.has(roomId)) {
        this.connectedUsers.set(roomId, new Set());
      }
      this.connectedUsers.get(roomId)!.add(userId);

      // ✅ 3. Socket.IO 방에 참여
      client.join(`room-${roomId}`);
      client.emit('joinedRoom', { roomId });
      console.log(`User ${userId} joined room ${roomId}`);
    } catch (error) {
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
      await this.chatService.checkUserCanAccessRoom(userId, roomId);

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
