import * as dotenv from 'dotenv';
import { ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { SeederOptions } from 'typeorm-extension';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

const envFile = `.env.${process.env.NODE_ENV || 'production'}`;
dotenv.config({ path: envFile });

// ✅ 수정됨: CLI(마이그레이션) 용 설정
// ts-node로 실행되므로 'src' 폴더의 .ts 파일을 직접 바라봅니다.
export const createStandaloneDataSource = (): DataSourceOptions &
  SeederOptions => ({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: +process.env.DATABASE_PORT!,
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_DBNAME,
  synchronize: process.env.DATABASE_SYNCHRONIZE === 'true',
  dropSchema: process.env.DATABASE_DROP_SCHEMA === 'true',
  logging: process.env.DATABASE_LOGGING === 'true',
  migrationsRun: false,
  migrationsTableName: 'migration_history',
  // ▼▼▼ 경로 수정됨 (dist -> src, .js -> .ts) ▼▼▼
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/db/migrations/*.ts'],
  seeds: ['src/db/seeds/**/*.seed.ts'],
  factories: ['src/db/factories/**/*.factory.ts'],
  // ▲▲▲ 경로 수정됨 ▲▲▲
  namingStrategy: new SnakeNamingStrategy(),
});

// 앱 실행(NestJS) 용 설정 (기존 유지)
export const createNestJSDatasource = (
  configService: ConfigService,
): DataSourceOptions & SeederOptions => ({
  type: 'postgres',
  host: configService.get<string>('DATABASE_HOST'),
  port: configService.get<number>('DATABASE_PORT'),
  username: configService.get<string>('DATABASE_USER'),
  password: configService.get<string>('DATABASE_PASSWORD'),
  database: configService.get<string>('DATABASE_DBNAME'),
  synchronize: configService.get<boolean>('DATABASE_SYNCHRONIZE'),
  dropSchema: configService.get<boolean>('DATABASE_DROP_SCHEMA'),
  logging: configService.get<boolean>('DATABASE_LOGGING'),
  migrationsRun: false,
  migrationsTableName: 'migration_history',
  entities: ['dist/**/*.entity.js'], // 앱 구동 시에는 빌드된 파일을 봅니다.
  migrations: ['dist/db/migrations/*.js'],
  seeds: ['dist/db/seeds/**/*.seed.js'],
  factories: ['dist/db/factories/**/*.factory.js'],
  namingStrategy: new SnakeNamingStrategy(),
});

export default new DataSource({
  ...createStandaloneDataSource(),
});