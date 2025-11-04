import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import {
  initializeTransactionalContext,
  StorageDriver,
} from 'typeorm-transactional';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  initializeTransactionalContext({ storageDriver: StorageDriver.AUTO });
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new IoAdapter(app));

  const configService = app.get(ConfigService);
  if (configService.get<boolean>('DATABASE_MIGRATIONS_RUN')) {
    const dataSource = app.get(DataSource);
    await dataSource.runMigrations({ transaction: 'all' });
  }

  const port = configService.get<number>('HTTP_SERVER_POST', 3000);
  const frontEndOrigin = configService.get<string>(
    'FRONTEND_ORIGIN',
    'http://localhost:3000',
  );

  console.log(`[DEBUG] CORS origin이 다음으로 설정됨: ${frontEndOrigin}`);

  app.enableCors({
  origin: frontEndOrigin, // .env에 설정된 'http://localhost:4000'
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'], // 'GET', 'POST', 'PATCH', 'DELETE' 등 모든 메서드 허용
  allowedHeaders: ['Content-Type', 'Authorization', 'Set-Cookie'], // 'Content-Type', 'Authorization' 등 모든 헤더 허용
  credentials: true,
  exposedHeaders: ['Set-Cookie'], // 이 줄은 있어도 되고 없어도 되지만, 만약을 위해 둡니다.
});

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Trpg_Sever-API')
    .setDescription('The Trpg_Sever-API description')
    .setVersion('1.0')
    .addTag('Trpg_Sever-API')
    .addBearerAuth()
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, documentFactory);

  await app.listen(port);
}
bootstrap();
