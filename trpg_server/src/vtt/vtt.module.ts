// src/vtt/vtt.module.ts
import { Module } from '@nestjs/common';
import { VttGateway } from './vtt.gateway';
import { VttService } from './vtt.service';
import { TokenModule } from '@/token/token.module';
import { VttmapModule } from '@/vttmap/vttmap.module';
import { AuthModule } from '@/auth/auth.module';
import { MapAssetModule } from '@/map-asset/map-asset.module';

@Module({
  imports: [TokenModule, VttmapModule, AuthModule, MapAssetModule,],
  providers: [VttGateway, VttService],
  exports: [VttService],
})
export class VttModule {}
