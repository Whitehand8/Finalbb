// src/chat/entities/chat-message.entity.ts

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '@/users/entities/user.entity';
import { ChatRoom } from './chat-room.entity';
import { ApiProperty } from '@nestjs/swagger'; // 1. ApiProperty 임포트

@Entity('chat_messages') // 테이블 이름을 명확히 구분
export class ChatMessage {
  @ApiProperty({ description: '메시지 ID' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    description: '메시지를 보낸 사용자 (AI 메시지인 경우 null)',
    nullable: true,
  })
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' }) // 2. nullable: true, onDelete 추가
  @JoinColumn({ name: 'sender_id' })
  sender: User | null; // 3. User | null 로 타입 변경

  // --- ⬇ AI 스피커 이름 컬럼 추가 ⬇ ---
  @ApiProperty({
    description: 'AI 스피커 이름 (일반 유저 메시지인 경우 null)',
    example: '사회자',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 100, name: 'speaker_name', nullable: true })
  speaker_name: string | null;
  // --- ⬆ AI 스피커 이름 컬럼 추가 ⬆ ---

  @ApiProperty({ description: '메시지가 속한 채팅방' })
  @ManyToOne(() => ChatRoom, (chatRoom) => chatRoom.messages)
  @JoinColumn({ name: 'chat_room_id' })
  chatRoom: ChatRoom;

  @ApiProperty({ description: '채팅 내용' })
  @Column({ type: 'text' })
  content: string; // 채팅 내용

  @ApiProperty({ description: '메시지 전송 시간' })
  @CreateDateColumn({ name: 'sent_at' })
  sentAt: Date; // 메시지 전송 시간
}