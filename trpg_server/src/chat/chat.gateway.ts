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
import { Inject, Logger } from '@nestjs/common'; // 1. Logger 임포트
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm'; // 2. InjectRepository 임포트
import { Room } from '@/room/entities/room.entity'; // 3. Room 엔티티 임포트
import { Repository } from 'typeorm'; // 4. Repository 임포트
import { AiService } from '@/ai/ai.service'; // 5. AiService 임포트
import { ParticipantRole } from '@/common/enums/participant-role.enum'; // 6. ParticipantRole 임포트

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
  private readonly logger = new Logger(ChatGateway.name); // 7. Logger 인스턴스화

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    private readonly chatService: ChatService,
    private readonly wsAuthMiddleware: WsAuthMiddleware,

    // --- ⬇ 8. AI 로직을 위한 의존성 주입 ⬇ ---
    private readonly aiService: AiService,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    // --- ⬆ AI 로직을 위한 의존성 주입 ⬆ ---
  ) {}

  afterInit(server: Server) {
    server.use(this.wsAuthMiddleware.createMiddleware());
  }

  handleConnection(client: Socket) {
    const user = client.data.user as jwtValidatedOutputDto;
    this.logger.log(
      `✅ Authenticated client connected: ${client.id}, User: ${user.email}`,
    );
  }

  handleDisconnect(client: Socket) {
    const user = client.data.user as jwtValidatedOutputDto;
    this.logger.log(`Client disconnected: ${client.id}, User: ${user.email}`);

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
    const roomId = data.roomId; // roomId는 chat_room_id 입니다.

    try {
      // ✅ 1. 권한 체크 (ChatService에서 수행)
      // (기존 코드에서는 주석 처리되어 있었음)
      // await this.chatService.checkUserCanAccessRoom(userId, roomId);

      // ✅ 2. NEW: 방에 접속 중인 사용자 목록에 추가
      if (!this.connectedUsers.has(roomId)) {
        this.connectedUsers.set(roomId, new Set());
      }
      this.connectedUsers.get(roomId)!.add(userId);

      this.logger.log(
        `[DEBUG] User ${userId} ADDED to connectedUsers for room ${roomId}`,
      );

      // ✅ 3. Socket.IO 방에 참여
      client.join(`room-${roomId}`);
      client.emit('joinedRoom', { roomId });
      this.logger.log(`User ${userId} joined room ${roomId}`);
    } catch (error) {
      this.logger.error(
        `[DEBUG] handleJoinRoom FAILED for user ${userId} in room ${roomId}:`,
        error.message,
      );
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
    this.logger.log(`User ${user.id} left room ${roomId}`);
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() createMessagesDto: CreateChatMessagesDto,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const user = client.data.user as jwtValidatedOutputDto;
    const userId = user.id;
    const chatRoomId = createMessagesDto.roomId; // 이 roomId는 chat_room_id 입니다.

    try {
      // ✅ 1. 권한 체크: 사용자가 이 방에 접속해 있는지(joinRoom을 했는지) 확인
      const isCurrentlyInRoom =
        this.connectedUsers.get(chatRoomId)?.has(userId);
      if (!isCurrentlyInRoom) {
        client.emit('error', { message: CHAT_ERRORS.INVALID_PARTICIPANT });
        return;
      }

      // ✅ 2. 사용자 메시지 저장 (createMessages는 배열을 반환함)
      const savedMessages: MessageResponseDto[] =
        await this.chatService.createMessages(userId, createMessagesDto);

      const userMessage = savedMessages[0];
      if (!userMessage) {
        throw new Error('메시지 저장에 실패했습니다.');
      }

      // ✅ 3. 사용자 메시지를 방에 브로드캐스트
      this.server.to(`room-${chatRoomId}`).emit('newMessage', userMessage);

      // --- ⬇ 9. AI 응답 로직 (비동기 호출) ⬇ ---
      // AI 응답이 느리더라도 사용자 메시지는 즉시 전송되도록
      // 'await'를 붙이지 않고 백그라운드에서 실행합니다.
      this.triggerAiReply(chatRoomId, userId, user.email, userMessage.content);
      // --- ⬆ AI 응답 로직 (비동기 호출) ⬆ ---
    } catch (error) {
      this.logger.error(
        `[sendMessage] Error: ${error.message}`,
        error.stack,
      );
      client.emit('error', { message: error.message });
    }
  }

  /**
   * AI 응답을 비동기적으로 트리거하는 헬퍼 메소드
   */
  private async triggerAiReply(
    chatRoomId: number,
    userId: number,
    userEmail: string,
    userInput: string,
  ) {
    try {
      // 1. chat_room_id를 사용해 TRPG Room 정보(ai_session_id 포함)를 조회
      const trpgRoom = await this.roomRepository.findOne({
        where: { chat_room_id: chatRoomId },
        relations: ['participants', 'participants.user'], // 참가자 역할(GM/PLAYER) 확인
      });

      // 2. AI 방이 아니거나 ai_session_id가 없으면 AI 로직을 실행하지 않고 종료
      if (!trpgRoom || !trpgRoom.ai_session_id) {
        return;
      }

      this.logger.log(
        `[AI] Triggering AI reply for room: ${trpgRoom.id} (session: ${trpgRoom.ai_session_id})`,
      );

      // 3. 메시지를 보낸 사용자의 TRPG Room 내 역할(GM/PLAYER) 확인
      const participant = trpgRoom.participants.find(
        (p) => p.user.id === userId,
      );
      
      // GM이면 'gm', 그 외(PLAYER 등)는 'player'로 매핑
      const userRole =
        participant?.role === ParticipantRole.GM ? 'gm' : 'player';

      // 4. ai_server(/trpg/reply)에 보낼 페이로드 조립
      const aiPayload = {
        session_id: trpgRoom.ai_session_id,
        user_input: userInput,
        role: userRole,
        character: userEmail, // AI가 인식할 플레이어 이름
        situation: 'dev', // ai_server/main.py에 정의된 기본값
        persona: null, // AI가 페르소나를 추론하도록 함
      };

      // 5. AI 서비스 호출 (HTTP 요청)
      const aiReply = await this.aiService.getReply(aiPayload);

      // 6. AI가 유효한 응답을 보냈는지 확인
      if (aiReply && aiReply.reply) {
        // 7. AI의 응답을 ChatService를 통해 DB에 저장 (speaker_name 사용)
        const aiMessageDto = await this.chatService.createAiMessage(
          chatRoomId,
          aiReply,
        );

        // 8. AI의 응답을 방 전체에 브로드캐스트 (사용자와 동일한 'newMessage' 이벤트 사용)
        this.server.to(`room-${chatRoomId}`).emit('newMessage', aiMessageDto);

        this.logger.log(`[AI] Reply sent by ${aiReply.speaker} to room ${chatRoomId}`);
      }
    } catch (error) {
      // AI 응답 실패는 사용자에게 에러를 emit하지 않고, 서버에만 로깅합니다.
      // (사용자 메시지는 이미 성공적으로 전송되었기 때문)
      this.logger.error(
        `[AI] Failed to get AI reply for chatRoom ${chatRoomId}: ${error.message}`,
        error.stack,
      );
    }
  }
}