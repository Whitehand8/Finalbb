// src/charactersheet/dto/update-character-sheet.dto.ts
import {
  IsObject,
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCharacterSheetDto {
  @ApiProperty({
    type: Object,
    example: {
      hp: 50,
      // imageUrl: 'https://d12345.cloudfront.net/.../new-avatar.png', // ← 예시 추가
    },
    description: '갱신할 캐릭터 시트 데이터 (선택 사항)',
    required: false,
  })
  @IsObject()
  @IsOptional()
  data?: object;

  @ApiProperty({
    example: true,
    description: '공개 여부 (GM 전용, 생략 가능)',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiProperty({
    example: 'https://s3.example.com/path/to/new_image.png',
    description: '캐릭터 시트 초상화 이미지 URL (선택 사항)',
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsUrl({}, { message: 'portraitImageUrl must be a valid URL' })
  @IsString()
  portraitImageUrl?: string | null;
}