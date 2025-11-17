import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AiService } from './ai.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 60000, // AI 응답이 길어질 수 있으니 타임아웃을 10초로 설정
      maxRedirects: 5,
    }),
  ],
  providers: [AiService],
  exports: [AiService], // 다른 모듈(RoomModule, ChatModule)에서 AiService를 주입할 수 있도록 export합니다.
})
export class AiModule {}