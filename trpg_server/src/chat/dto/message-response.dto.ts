// src/chat/dto/message-response.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsDate, IsOptional } from 'class-validator'; // 1. IsOptional 임포트
import { ChatMessage } from '../entities/chat-message.entity';

export class MessageResponseDto {
  @ApiProperty({ example: 1, description: '메시지 고유 ID' })
  @IsNumber()
  id: number;

  @ApiProperty({
    example: 101,
    description: '발신자 사용자 ID (AI 메시지인 경우 null)',
    nullable: true, // 2. nullable로 변경
  })
  @IsNumber()
  @IsOptional() // 3. IsOptional 추가
  senderId: number | null; // 4. null 타입 추가

  // --- ⬇ AI 스피커 이름 필드 추가 ⬇ ---
  @ApiProperty({
    example: '사회자',
    description: 'AI 스피커 이름 (일반 유저 메시지인 경우 null)',
    nullable: true,
    required: false,
  })
  @IsString()
  @IsOptional()
  speakerName: string | null;
  // --- ⬆ AI 스피커 이름 필드 추가 ⬆ ---

  @ApiProperty({
    example: 'Hello, world!',
    description: '메시지 내용',
  })
  @IsString()
  content: string;

  @ApiProperty({
    example: '2024-06-07T10:00:00.000Z',
    description: '메시지 전송 시간',
  })
  @IsDate()
  sentAt: Date;

  static fromEntity(entity: ChatMessage): MessageResponseDto {
    const dto = new MessageResponseDto();
    dto.id = entity.id;
    // 5. entity.sender가 null일 수 있음을 처리
    dto.senderId = entity.sender ? entity.sender.id : null;
    dto.content = entity.content;
    dto.sentAt = entity.sentAt;
    // 6. speaker_name을 speakerName으로 매핑
    dto.speakerName = entity.speaker_name || null;
    return dto;
  }
}