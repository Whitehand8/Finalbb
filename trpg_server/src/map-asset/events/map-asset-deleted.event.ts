/**
 * 'map_asset.deleted' 이벤트 페이로드 클래스입니다.
 * 'src/token/events/token-deleted.event.ts'의 패턴을 따릅니다.
 */
export class MapAssetDeletedEvent {
  constructor(
    public readonly id: string, // 삭제된 에셋 ID
    public readonly mapId: string, // 에셋이 속해있던 맵 ID
  ) {}
}