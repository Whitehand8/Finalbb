import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { MapAsset } from './entities/map-asset.entity';

import { CreateMapAssetDto } from './dto/create-map-asset.dto';
import { UpdateMapAssetDto } from './dto/update-map-asset.dto';

import { MAP_ASSET_EVENTS } from './constants/events';
import { MapAssetCreatedEvent } from './events/map-asset-created.event';
import { MapAssetDeletedEvent } from './events/map-asset-deleted.event';
import { MapAssetUpdatedEvent } from './events/map-asset-updated.event';

/**
 * MapAsset의 비즈니스 로직을 처리하는 서비스입니다.
 * TokenService의 구조를 기반으로 합니다.
 */
@Injectable()
export class MapAssetService {
  constructor(
    @InjectRepository(MapAsset)
    private readonly mapAssetRepository: Repository<MapAsset>,
    private readonly eventEmitter: EventEmitter2,
    // [참고] TokenValidatorService와 달리, MapAsset은 '누구나' 수정/삭제 가능하므로
    // 별도의 Validator 서비스를 주입하지 않습니다.
  ) {}

  /**
   * 새로운 맵 에셋을 생성합니다. (API 컨트롤러에서 호출)
   */
  async create(
    mapId: string,
    createMapAssetDto: CreateMapAssetDto,
  ): Promise<MapAsset> {
    // [참고] TokenService와 달리 권한 검증(Validator) 로직이 없습니다.

    const newAsset = this.mapAssetRepository.create({
      ...createMapAssetDto,
      mapId,
    });

    const savedAsset = await this.mapAssetRepository.save(newAsset);

    // VTT 게이트웨이가 수신할 이벤트를 발행합니다.
    this.eventEmitter.emit(
      MAP_ASSET_EVENTS.CREATED,
      new MapAssetCreatedEvent(savedAsset),
    );

    return savedAsset;
  }

  /**
   * 특정 맵에 속한 모든 에셋을 조회합니다. (vtt.gateway.ts의 'joinMap'에서 호출)
   */
  async findAllByMapId(mapId: string): Promise<MapAsset[]> {
    // [참고] TokenService의 'canMove' 권한 부여 로직이 필요 없습니다.
    return this.mapAssetRepository.find({
      where: { mapId },
    });
  }

  /**
   * ID로 단일 맵 에셋을 조회합니다. (내부용 헬퍼)
   */
  async findOne(id: string): Promise<MapAsset> {
    const asset = await this.mapAssetRepository.findOne({ where: { id } });
    if (!asset) {
      throw new NotFoundException(`ID가 "${id}"인 맵 에셋을 찾을 수 없습니다.`);
    }
    return asset;
  }

  /**
   * 맵 에셋 정보를 업데이트합니다. (API 또는 소켓 게이트웨이에서 호출)
   * TokenService.updatePosition의 로직을 겸합니다.
   */
  async update(
    id: string,
    updateMapAssetDto: UpdateMapAssetDto,
  ): Promise<MapAsset> {
    // [참고] TokenService와 달리 권한 검증(Validator) 로직이 없습니다.

    // preload는 DB에서 엔티티를 로드하고 DTO의 변경사항을 병합합니다.
    const asset = await this.mapAssetRepository.preload({
      id,
      ...updateMapAssetDto,
    });

    if (!asset) {
      throw new NotFoundException(`ID가 "${id}"인 맵 에셋을 찾을 수 없습니다.`);
    }

    const updatedAsset = await this.mapAssetRepository.save(asset);

    // VTT 게이트웨이가 수신할 이벤트를 발행합니다.
    this.eventEmitter.emit(
      MAP_ASSET_EVENTS.UPDATED,
      new MapAssetUpdatedEvent(updatedAsset),
    );

    return updatedAsset;
  }

  /**
   * 맵 에셋을 삭제합니다. (API 또는 소켓 게이트웨이에서 호출)
   */
  async remove(id: string): Promise<MapAsset> {
    // [참고] TokenService와 달리 권한 검증(Validator) 로직이 없습니다.

    const asset = await this.findOne(id); // 먼저 에셋을 조회합니다 (NotFoundException 처리 포함)

    // [요구사항 4] DB 레코드만 삭제합니다. S3 파일은 삭제하지 않습니다.
    await this.mapAssetRepository.remove(asset);

    // VTT 게이트웨이가 수신할 이벤트를 발행합니다.
    this.eventEmitter.emit(
      MAP_ASSET_EVENTS.DELETED,
      new MapAssetDeletedEvent(asset.id, asset.mapId), // TokenDeletedEvent 패턴을 따름
    );

    // TokenService.remove와 동일하게 삭제된 객체를 반환합니다.
    return asset;
  }
}