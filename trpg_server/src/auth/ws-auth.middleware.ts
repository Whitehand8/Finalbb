// src/auth/ws-auth.middleware.ts
import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { WsException } from '@nestjs/websockets';
import { AuthService } from './auth.service';

export type SocketMiddleware = (
  socket: Socket,
  next: (err?: Error) => void,
) => void;

@Injectable()
export class WsAuthMiddleware {
  constructor(private readonly authService: AuthService) {}

  createMiddleware(): SocketMiddleware {
    return async (socket, next) => {
      try {
        // --- 🚨 [수정된 로직] ---
        // 1. (가장 먼저) socket.handshake.auth 객체에서 토큰을 확인합니다.
        //    프론트엔드의 VttSocketService가 이 방식을 사용합니다.
        let token = socket.handshake.auth.token as string;

        // 2. (대체) auth 객체에 토큰이 없다면, query를 확인합니다.
        //    (ChatService 등 다른 서비스가 이 방식을 사용할 수 있습니다)
        if (!token) {
          token = socket.handshake.query.token as string;
        }

        // 3. (대체) query에도 없다면, authorization 헤더를 확인합니다.
        if (!token) {
          const authHeader = socket.handshake.headers.authorization;
          if (authHeader) {
            token = authHeader?.split(' ')[1];
          }
        }
        // --- 🚨 [수정 끝] ---

        if (!token) throw new WsException('No token provided');

        const payload =
          await this.authService.validateTokenForAnyContext(token);
        socket.data.user = payload;
        next();
      } catch (error) {
        next(
          error instanceof Error ? error : new Error('Authentication failed'),
        );
      }
    };
  }
}