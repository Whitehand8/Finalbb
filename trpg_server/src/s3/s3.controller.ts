
import {
  Controller,
  Post,
  Body,
  BadRequestException,
  UseGuards,
  UploadedFile, // 👈 [유지] import문에 이미 있으므로 그대로 둡니다.
  UseInterceptors, // 👈 [유지]
  Query, // 👈 [유지]
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { v4 as uuidv4 } from 'uuid';
import { S3Service } from './s3.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';

// --- [신규] 2개의 import 추가 ---
import { CreatePresignedUrlDto } from '@/common/dto/create-presigned-url.dto';
import { validateImageUpload } from '@/common/utils/validate-image-upload';
// --- [신규 끝] ---

@ApiBearerAuth()
@Controller('s3')
export class S3Controller {
  constructor(private readonly s3Service: S3Service) {}

  // 기존 주석 처리된 uploadDirect 메소드는 그대로 둡니다. (기존 코드 존중)
  /*
  @Post('upload/direct')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadDirect(
    @UploadedFile() file: Express.Multer.File,
    @Query('path') path: string,
  ) {
    // ...
  }
  */

  @Post('presigned-url')
  @UseGuards(JwtAuthGuard) // 🚨 [필수] 이 보안 가드를 반드시 유지합니다.
  async getPresignedUrl(
    // --- [수정] DTO를 사용하도록 변경 ---
    @Body() createDto: CreatePresignedUrlDto,
  ) {
    const { fileName, contentType } = createDto;

    // --- [수정] 기존 유효성 검사 로직 삭제 ---
    // const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    // ... (이하 낡은 로직 모두 삭제) ...

    // --- [신규] 유틸리티를 사용한 유효성 검사 ---
    const ext = validateImageUpload(fileName, contentType);
    // --- [신규 끝] ---

    // key 생성 로직은 기존 로직 재사용
    const key = `uploads/${uuidv4()}.${ext === 'jpeg' ? 'jpg' : ext}`;

    const presignedUrl = await this.s3Service.getPresignedPutUrl(
      key,
      contentType,
    );
    // [수정] 원본 파일에 publicUrl을 반환하는 로직이 있었으므로 유지합니다.
    const publicUrl = this.s3Service.getCloudFrontUrl(key);

    return {
      presignedUrl,
      publicUrl,
      key,
    };
  }

  // --- [수정] 낡은 getExtension 함수 삭제 ---
  // private getExtension(filename: string): string {
  //   return filename.split('.').pop()?.toLowerCase() || 'bin';
  // }
}
