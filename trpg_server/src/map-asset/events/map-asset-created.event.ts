import { MapAsset } from '../entities/map-asset.entity';

/**
 * 'map_asset.created' 이벤트 페이로드 클래스입니다.
 * 'src/token/events/token-created.event.ts'의 패턴을 따릅니다.
 */
export class MapAssetCreatedEvent {
  constructor(public readonly mapAsset: MapAsset) {}
}