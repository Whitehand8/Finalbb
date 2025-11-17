import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  IsBoolean, // 1. IsBoolean 임포트
} from 'class-validator';
import { ROOM_ERRORS } from '../constants/room.constants';
import { TrpgSystem } from '@/common/enums/trpg-system.enum';

export class CreateRoomDto {
  @ApiProperty({
    description: 'TRPG 시스템 선택',
    enum: TrpgSystem,
    default: TrpgSystem.DND5E,
  })
  @IsEnum(TrpgSystem, {
    message: ROOM_ERRORS.INVALID_TRPG_SYSTEM,
  })
  system?: TrpgSystem = TrpgSystem.DND5E;

  @ApiProperty({
    description: '방 이름 (1~50자)',
    example: '고블린 사냥',
  })
  @IsString()
  @MinLength(1, { message: ROOM_ERRORS.INVALID_ROOM_NAME })
  @MaxLength(50, { message: ROOM_ERRORS.INVALID_ROOM_NAME_LENGTH })
  name: string;

  @ApiProperty({
    description: '방 비밀번호 (변경 불가)',
    example: '123',
  })
  @IsString()
  @MinLength(1, { message: ROOM_ERRORS.PASSWORD_REQUIRED })
  password: string;

  @ApiProperty({
    description: '최대 참여자 수 (2~8)',
    default: 2,
    minimum: 2,
    maximum: 8,
  })
  @IsInt()
  @Min(2, { message: ROOM_ERRORS.INVALID_MAX_PARTICIPANTS_MIN })
  @Max(8, { message: ROOM_ERRORS.INVALID_MAX_PARTICIPANTS_MAX })
  @IsOptional()
  maxParticipants?: number = 2;

  // --- ⬇ 2. AI 방 생성을 위한 필드 추가 ⬇ ---

  @ApiProperty({
    description: 'AI 방 여부',
    example: false,
    default: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isAiRoom?: boolean = false;

  @ApiProperty({
    description: 'AI 방 세계관 (isAiRoom이 true일 때 필요)',
    example: '현대 서울의 도시 미스터리',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: '세계관 설명은 100자 이내여야 합니다.' })
  world?: string;

  @ApiProperty({
    description: 'AI 방 테마 (isAiRoom이 true일 때 필요)',
    example: '기이한 실종',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: '테마 설명은 100자 이내여야 합니다.' })
  theme?: string;

  // --- ⬆ 2. AI 방 생성을 위한 필드 추가 ⬆ ---
}