    import { PartialType } from '@nestjs/swagger';
    import { CreateMapAssetDto } from './create-map-asset.dto';

    /**
     * 맵 에셋(MapAsset) 수정을 위한 DTO입니다.
     * CreateMapAssetDto의 모든 필드를 선택적으로(optional) 만듭니다.
     *
     * UpdateTokenDto가 PartialType(CreateTokenDto)을 사용하는 기존 패턴을 따릅니다.
     */
    export class UpdateMapAssetDto extends PartialType(CreateMapAssetDto) {}