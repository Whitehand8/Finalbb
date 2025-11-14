import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';

import { MapAssetService } from './map-asset.service';
import { CreateMapAssetDto } from './dto/create-map-asset.dto';
import { UpdateMapAssetDto } from './dto/update-map-asset.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MapAsset } from './entities/map-asset.entity';

/**
 * 맵 에셋(MapAsset) 관련 API 컨트롤러입니다.
 * TokenController의 구조를 기반으로 합니다.
 */
@ApiTags('VTT - Map Assets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard) // 컨트롤러 전체에 인증 가드 적용
@Controller('map-asset') // vtt_service.dart에서 설정한 '/map-asset' 경로
export class MapAssetController {
  constructor(private readonly mapAssetService: MapAssetService) {}

  /**
   * 새 맵 에셋 생성 (프론트엔드 S3 업로드 완료 후 호출됨)
   */
  @Post()
  @ApiOperation({ summary: '새 맵 에셋 생성' })
  @ApiQuery({ name: 'mapId', type: 'string', description: '에셋을 생성할 맵 ID' })
  @ApiBody({ type: CreateMapAssetDto })
  @ApiResponse({
    status: 201,
    description: '맵 에셋 생성 성공',
    // TokenController의 응답 형식을 따름
    schema: {
      properties: {
        message: { type: 'string' },
        mapAsset: { type: 'object' }, // (자세한 DTO 정의는 생략)
      },
    },
  })
  async createMapAsset(
    // TokenController와 동일하게 mapId를 쿼리로 받음
    @Query('mapId', ParseUUIDPipe) mapId: string,
    @Body() createMapAssetDto: CreateMapAssetDto,
  ): Promise<{ message: string; mapAsset: MapAsset }> {
    // [참고] TokenController와 달리 User 객체를 서비스로 넘기지 않음
    // (MapAssetService에서 권한 검증이 필요 없기 때문)
    const mapAsset = await this.mapAssetService.create(mapId, createMapAssetDto);
    return { message: '맵 에셋이 성공적으로 생성되었습니다.', mapAsset };
  }

  /**
   * 맵 에셋 정보 업데이트 (위치, 크기 등)
   * [참고] 프론트엔드는 현재 소켓으로 이 기능을 처리하지만,
   * TokenController의 패턴 일관성을 위해 API 엔드포인트도 생성합니다.
   */
  @Patch(':id')
  @ApiOperation({ summary: '맵 에셋 정보 업데이트 (위치, 크기)' })
  @ApiParam({ name: 'id', type: 'string', description: '맵 에셋 UUID' })
  @ApiBody({ type: UpdateMapAssetDto })
  @ApiResponse({
    status: 200,
    description: '맵 에셋 업데이트 성공',
    schema: {
      properties: {
        message: { type: 'string' },
        mapAsset: { type: 'object' },
      },
    },
  })
  async updateMapAsset(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateMapAssetDto: UpdateMapAssetDto,
  ): Promise<{ message: string; mapAsset: MapAsset }> {
    const mapAsset = await this.mapAssetService.update(id, updateMapAssetDto);
    return { message: '맵 에셋이 성공적으로 업데이트되었습니다.', mapAsset };
  }

  /**
   * 맵 에셋 삭제
   * [참고] 프론트엔드는 현재 소켓으로 이 기능을 처리하지만,
   * TokenController의 패턴 일관성을 위해 API 엔드포인트도 생성합니다.
   */
  @Delete(':id')
  @ApiOperation({ summary: '맵 에셋 삭제' })
  @ApiParam({ name: 'id', type: 'string', description: '맵 에셋 UUID' })
  @ApiResponse({
    status: 200,
    description: '맵 에셋 삭제 성공',
    schema: { properties: { message: { type: 'string' } } },
  })
  async deleteMapAsset(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.mapAssetService.remove(id);
    return { message: '맵 에셋이 성공적으로 삭제되었습니다.' };
  }
}