import { MapAsset } from '../entities/map-asset.entity';

/**
 * 'map_asset.updated' 이벤트 페이로드 클래스입니다.
 * 'src/token/events/token-updated.event.ts'의 패턴을 따릅니다.
 */
export class MapAssetUpdatedEvent {
  constructor(public readonly mapAsset: MapAsset) {}
}