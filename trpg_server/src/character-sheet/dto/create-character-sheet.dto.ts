// src/charactersheet/dto/create-character-sheet.dto.ts
import { IsObject, IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCharacterSheetDto {
  @ApiProperty({
    type: Object,
    example: {
      name: 'New Character',
      // imageUrl: 'https://example.com/default-avatar.png', // 이 부분은 data 객체 내부의 예시입니다.
      level: 1,
    },
    description: '캐릭터 시트 데이터 (프론트에서 계산된 모든 값 포함)',
  })
  @IsObject()
  data: object;

  @ApiProperty({
    example: false,
    description: '초기 공개 여부 설정 (GM 전용)',
  })
  @IsBoolean()
  isPublic: boolean;

  @ApiProperty({
    example: 'https://s3.example.com/path/to/image.png',
    description: '캐릭터 시트 초상화 이미지 URL (선택 사항)',
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsUrl({}, { message: 'portraitImageUrl must be a valid URL' })
  @IsString()
  portraitImageUrl?: string | null;
}