import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsUrl } from 'class-validator';

/**
 * 맵 에셋(MapAsset) 생성을 위한 DTO입니다.
 * CreateTokenDto의 구조를 기반으로 합니다.
 */
export class CreateMapAssetDto {
  @ApiProperty({
    description: 'S3에 업로드된 이미지의 전체 URL',
    example: 'https://s3.ap-northeast-2.amazonaws.com/.../image.png',
  })
  @IsUrl() // IsString 대신 더 엄격한 IsUrl 사용
  url: string;

  @ApiProperty({ example: 350.5, description: 'X 좌표' })
  @IsNumber()
  x: number;

  @ApiProperty({ example: 420.0, description: 'Y 좌표' })
  @IsNumber()
  y: number;

  @ApiPropertyOptional({
    example: 100.0,
    description: '이미지 너비 (기본값: 100.0)',
  })
  @IsNumber()
  @IsOptional()
  width?: number;

  @ApiPropertyOptional({
    example: 100.0,
    description: '이미지 높이 (기본값: 100.0)',
  })
  @IsNumber()
  @IsOptional()
  height?: number;
}