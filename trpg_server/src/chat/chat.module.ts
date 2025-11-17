import { Module, forwardRef } from '@nestjs/common';
import { ChatService } from './chat.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatParticipant } from './entities/chat-participant.entity';
import { ChatRoom } from './entities/chat-room.entity';
import { ChatController } from './chat.controller';
import { UsersModule } from '@/users/users.module';
import { ChatGateway } from './chat.gateway';
import { AuthModule } from '@/auth/auth.module';
import { AiModule } from '@/ai/ai.module'; // 1. AiModule 임포트
import { Room } from '@/room/entities/room.entity'; // 2. Room 엔티티 임포트

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatRoom,
      ChatParticipant,
      ChatMessage,
      Room, // 3. Room 엔티티를 TypeOrm에 등록
    ]),
    forwardRef(() => UsersModule),
    AuthModule,
    AiModule, // 4. AiModule 임포트
  ],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
  controllers: [ChatController],
})
export class ChatModule {}