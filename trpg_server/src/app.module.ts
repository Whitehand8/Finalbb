import * as Joi from 'joi';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { DbModule } from './db/db.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { RoomModule } from './room/room.module';
import { ChatModule } from './chat/chat.module';
import { CharacterSheetModule } from './character-sheet/character-sheet.module';
import { NpcModule } from './npc/npc.module';
// import { HttpModule } from '@nestjs/axios'; // AiModule이 HttpModule을 관리하므로 여기서 제거합니다.
import { S3Module } from './s3/s3.module';
import { VttmapModule } from './vttmap/vttmap.module';
import { TokenModule } from './token/token.module';
import { VttModule } from './vtt/vtt.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MapAssetModule } from './map-asset/map-asset.module';
import { AiModule } from './ai/ai.module'; // 1. AiModule을 import합니다.

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV}`,
      validationSchema: Joi.object({
        HTTP_SERVER_POST: Joi.number().required(),
        DATABASE_HOST: Joi.string().required(),
        DATABASE_PORT: Joi.number().required(),
        DATABASE_USER: Joi.string().required(),
        DATABASE_PASSWORD: Joi.string().required(),
        DATABASE_DBNAME: Joi.string().required(),
        DATABASE_SYNCHRONIZE: Joi.boolean().required(),
        DATABASE_DROP_SCHEMA: Joi.boolean().required(),
        DATABASE_LOGGING: Joi.boolean().required(),
        DATABASE_MIGRATIONS_RUN: Joi.boolean().required(),
        JWT_SECRET: Joi.string().required(),
        FRONTEND_ORIGIN: Joi.string()
          .empty('')
          .uri()
          .optional()
          .default('http://localhost:3000')
          .description('Frontend origin for CORS'),
        AWS_REGION: Joi.string().required(),
        AWS_ACCESS_KEY_ID: Joi.string().optional(),
        AWS_SECRET_ACCESS_KEY: Joi.string().optional(),
        S3_BUCKET_NAME: Joi.string().required(),
        CLOUDFRONT_DOMAIN: Joi.string().required(),
        // AI_SERVER_URL: Joi.string().uri().optional(), // 필요시 .env 검증에 추가
      }),
    }),
    UsersModule,
    DbModule,
    AuthModule,
    RoomModule,
    ChatModule,
    CharacterSheetModule,
    NpcModule,
    // HttpModule, // 2. 여기서 HttpModule을 제거합니다.
    S3Module,
    VttmapModule,
    TokenModule,
    VttModule,
    EventEmitterModule.forRoot(),
    MapAssetModule,
    AiModule, // 3. AiModule을 imports 배열에 추가합니다.
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}