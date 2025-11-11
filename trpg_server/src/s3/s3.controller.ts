// src/s3/s3.controller.ts
import {
  Controller,
  Post,
  Body,
  BadRequestException,
  UseGuards,
  // ... (기존 import)
} from '@nestjs/common';
// ... (기존 import)
import { v4 as uuidv4 } from 'uuid';
import { S3Service } from './s3.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';

// --- 추가 ---
import { CreatePresignedUrlDto } from '@/common/dto/create-presigned-url.dto';
import { validateImageUpload } from '@/common/utils/validate-image-upload';
// --- 추가 ---

@ApiBearerAuth()
@Controller('s3')
export class S3Controller {
  constructor(private readonly s3Service: S3Service) {}

  // ... (주석 처리된 uploadDirect 메소드) ...

  @Post('presigned-url')
  async getPresignedUrl(
    // --- 수정 ---
    // @Body('fileName') fileName: string,
    // @Body('contentType') contentType: string,
    @Body() createDto: CreatePresignedUrlDto,
    // --- 수정 ---
  ) {
    const { fileName, contentType } = createDto;

    // --- 제거 (DTO와 validateImageUpload 함수로 대체) ---
    // const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    // if (!allowedTypes.includes(contentType)) {
    //   throw new BadRequestException('Invalid content type');
    // }

    // const ext = this.getExtension(fileName);
    // const allowedExts = ['jpg', 'jpeg', 'png', 'webp'];
    // if (!allowedExts.includes(ext)) {
    //   throw new BadRequestException('TEST_BUILD_123_INVALID_TYPE');
    // }
    // --- 제거 ---

    // --- 추가 (신형 로직 사용) ---
    const ext = validateImageUpload(fileName, contentType);
    // --- 추가 ---

    // key 생성 로직은 기존 로직 재사용
    const key = `uploads/${uuidv4()}.${ext === 'jpeg' ? 'jpg' : ext}`;

    const presignedUrl = await this.s3Service.getPresignedPutUrl(
      key,
      contentType,
    );
    const publicUrl = this.s3Service.getCloudFrontUrl(key);

    return {
      presignedUrl,
      publicUrl,
      key,
    };
  }

  // getExtension은 이제 validateImageUpload 유틸리티가 대체하므로 제거해도 됩니다.
  // private getExtension(filename: string): string {
  //   return filename.split('.').pop()?.toLowerCase() || 'bin';
  // }
}