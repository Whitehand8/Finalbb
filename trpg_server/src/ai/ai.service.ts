import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

// ai_server/main.py의 InitStoryRequest 모델과 일치
interface AiInitStoryRequest {
  core: {
    world: string;
    theme: string;
  };
}

// ai_server/main.py의 TRPGRequest 모델과 일치 (핵심 필드)
interface AiTrpgReplyRequest {
  session_id: string;
  user_input: string;
  role: string; // 'gm', 'player', 'npc', 'enemy'
  character: string; // "사회자", "플레이어1", "NPC이름"
  situation: string; // "dev" 또는 현재 상황 요약 (일단 "dev"로 고정해도 무방)
  persona?: any; // 선택적 페르소나 객체
}

// ai_server/main.py의 /trpg/init 응답
interface AiInitStoryResponse {
  session_id: string;
  outline: any[];
}

// ai_server/main.py의 /trpg/reply 응답 (성공 시)
interface AiTrpgReplyResponse {
  speaker: string;
  reply: string;
  emotion: string;
  roll?: number;
  detail?: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  
  // ai_server의 주소. 환경 변수에서 읽어오거나, 없으면 로컬 기본 주소 사용
  private readonly aiServerUrl =
    process.env.AI_SERVER_URL || 'http://localhost:8000';

  constructor(private readonly httpService: HttpService) {}

  /**
   * ai_server에 새 스토리 세션을 생성하도록 요청합니다.
   * @param storyCore - 세계관, 테마 정보가 담긴 객체
   */
  async initStory(storyCore: {
    world: string;
    theme: string;
  }): Promise<AiInitStoryResponse> {
    const endpoint = `${this.aiServerUrl}/trpg/init`;
    const payload: AiInitStoryRequest = { core: storyCore };
    this.logger.log(`Requesting AI Story init to ${endpoint}...`);

    try {
      const response = await firstValueFrom(
        this.httpService.post<AiInitStoryResponse>(endpoint, payload),
      );
      this.logger.log(`AI Session created: ${response.data.session_id}`);
      return response.data;
    } catch (error) {
      this.handleAiServerError(error, endpoint);
    }
  }

  /**
   * ai_server에 사용자 입력에 대한 응답을 요청합니다.
   * @param requestBody - TRPGRequest에 맞는 전체 요청 페이로드
   */
  async getReply(
    requestBody: AiTrpgReplyRequest,
  ): Promise<AiTrpgReplyResponse> {
    const endpoint = `${this.aiServerUrl}/trpg/reply`;
    this.logger.log(
      `Requesting AI reply for session: ${requestBody.session_id}...`,
    );

    try {
      const response = await firstValueFrom(
        this.httpService.post<AiTrpgReplyResponse>(endpoint, requestBody),
      );
      return response.data;
    } catch (error) {
      this.handleAiServerError(error, endpoint);
    }
  }

  /**
   * AI 서버 통신 오류를 공통으로 처리하고 로깅합니다.
   */
  private handleAiServerError(error: any, endpoint: string): never {
    if (error instanceof AxiosError) {
      this.logger.error(
        `AI Server Error at ${endpoint}: ${error.message}`,
        error.stack,
      );
      if (error.response) {
        // AI 서버(Python)가 보낸 구체적인 오류 메시지 (500, 422 등)
        this.logger.error(
          `AI Server Response Data: ${JSON.stringify(error.response.data)}`,
        );
      }
    } else {
      this.logger.error(
        `Unknown error communicating with AI server at ${endpoint}`,
        error.stack,
      );
    }
    // NestJS가 이 오류를 500 Internal Server Error로 처리하도록 예외를 던집니다.
    throw new Error('AI 서버 통신에 실패했습니다.');
  }
}