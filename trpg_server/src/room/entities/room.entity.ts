import { ApiProperty } from '@nestjs/swagger';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Check,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { RoomParticipant } from './room-participant.entity';
import { User } from '@/users/entities/user.entity';
import { TrpgSystem } from '@/common/enums/trpg-system.enum';
import { VttMap } from '@/vttmap/entities/vttmap.entity';
import { ChatRoom } from '@/chat/entities/chat-room.entity';

@Entity()
export class Room {
  @ApiProperty({ description: '공개 방 코드 (UUID, PK)' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: '선택된 TRPG 시스템',
    enum: TrpgSystem,
    default: TrpgSystem.DND5E,
  })
  @Column({
    type: 'enum',
    enum: TrpgSystem,
    default: TrpgSystem.DND5E,
  })
  system: TrpgSystem;

  @ApiProperty({ description: '방 이름' })
  @Column({ length: 50, nullable: false })
  name: string;

  @Column({ nullable: false })
  password: string;

  @ApiProperty({ description: '최대 참여자 수', default: 2 })
  @Column({ name: 'max_participants', default: 2 })
  @Check('"max_participants" >= 2 AND "max_participants" <= 8')
  maxParticipants: number;

  @ApiProperty({ description: '생성 시간' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: '수정 시간' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ApiProperty({ description: '삭제 시간 (null이면 활성)' })
  @DeleteDateColumn()
  deletedAt: Date | null;

  // --- ⬇ AI 세션 ID 컬럼 추가 ⬇ ---
  @ApiProperty({
    description: 'AI 서버 세션 ID (AI 방인 경우에만 사용)',
    nullable: true,
  })
  @Column({ type: 'varchar', name: 'ai_session_id', nullable: true })
  ai_session_id: string | null;
  // --- ⬆ AI 세션 ID 컬럼 추가 ⬆ ---

  // 방 참여자 목록
  @OneToMany(() => RoomParticipant, (participant) => participant.room)
  participants: RoomParticipant[];

  // 방 생성자
  @OneToOne(() => User, (user) => user.createdRoom, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  creator: User | null;

  @OneToMany(() => VttMap, (vttMap) => vttMap.room)
  vttmaps: VttMap[];

  @ApiProperty({ description: '연결된 채팅방 ID', nullable: true })
  @Column({ name: 'chat_room_id', type: 'int', nullable: true })
  chat_room_id: number; // 👈 서비스 로직에서 chat_room_id: newChatRoom.id를 위해 필요합니다.

  @OneToOne(() => ChatRoom, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'chat_room_id' }) // 👈 위 'chat_room_id' 컬럼을 외래 키로 사용합니다.
  chatRoom: ChatRoom;
}