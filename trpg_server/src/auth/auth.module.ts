import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '@/users/users.module';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtStrategy } from './jwt.strategy';
import { JwtModule } from '@nestjs/jwt';
import { RefreshTokenRepository } from './refresh-token.repository';
import { RefreshToken } from './entities/refresh-token.entity';
import { WsAuthMiddleware } from './ws-auth.middleware';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([RefreshToken]), // 추가
    forwardRef(() => UsersModule),

    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'mysecretkey'), // Load secret from env
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m'),
        }, // Load expiration from env
      }),
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    RefreshTokenRepository,
    WsAuthMiddleware,
  ],
  controllers: [AuthController],
  exports: [AuthService, WsAuthMiddleware],
})
export class AuthModule {}
