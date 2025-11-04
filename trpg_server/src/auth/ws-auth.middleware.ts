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
        let token = socket.handshake.query.token as string;

        if (!token) {
          const authHeader = socket.handshake.headers.authorization;
          token = authHeader?.split(' ')[1];
        }

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
