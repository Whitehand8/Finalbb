import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MapAssetService } from './map-asset.service';
import { MapAssetController } from './map-asset.controller';
import { MapAsset } from './entities/map-asset.entity';
import { RoomModule } from '@/room/room.module';
import { VttmapModule } from '@/vttmap/vttmap.module';

/**
 * MapAsset 모듈입니다.
 * TokenModule의 구조를 기반으로 합니다.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([MapAsset]), // MapAsset 엔티티 등록
    RoomModule, // TokenModule과 동일하게 import (권한 등 잠재적 사용)
    VttmapModule, // TokenModule과 동일하게 import (맵 정보 연관)
    // CharacterSheetModule은 MapAsset과 관련 없으므로 제외
  ],
  controllers: [MapAssetController], // MapAsset 컨트롤러 등록
  providers: [MapAssetService], // TokenValidatorService는 제외
  exports: [MapAssetService], // VttGateway 등 다른 모듈에서 사용
})
export class MapAssetModule {}