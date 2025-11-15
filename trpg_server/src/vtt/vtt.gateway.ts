import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { BadRequestException } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { VttService } from './vtt.service';
import { MoveTokenDto } from '@/token/dto/move-token.dto';
import { jwtValidatedOutputDto } from '@/auth/types/jwt-payload.dto';
import { WsAuthMiddleware } from '@/auth/ws-auth.middleware';
import {
  TOKEN_ERROR_MESSAGES,
  TokenErrorCode,
} from '@/token/constants/token.constants';
import { OnEvent } from '@nestjs/event-emitter';
import { MapUpdatedEvent } from './event/map-updated.event';
import { UpdateMapMessage } from './types/update-map-message.interface';
import { TokenCreatedEvent } from '@/token/events/token-created.event';
import { TokenUpdatedEvent } from '@/token/events/token-updated.event';
import { TokenDeletedEvent } from '@/token/events/token-deleted.event';
import { MapCreatedEvent } from './event/map-created.event';
import { MapDeletedEvent } from './event/map-deleted.event';

// --- [신규] MapAsset 모듈 import ---
import { MapAssetService } from '@/map-asset/map-asset.service';
import { MapAssetCreatedEvent } from '@/map-asset/events/map-asset-created.event';
import { MapAssetUpdatedEvent } from '@/map-asset/events/map-asset-updated.event';
import { MapAssetDeletedEvent } from '@/map-asset/events/map-asset-deleted.event';
import { MAP_ASSET_EVENTS } from '@/map-asset/constants/events';
// --- [신규 끝] ---

@WebSocketGateway(11123, {
  namespace: '/vtt',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class VttGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // mapId(string) → Set<userId>
  private readonly connectedRooms = new Map<string, Set<number>>();
  private readonly connectedMaps = new Map<string, Set<number>>();

  constructor(
    private readonly vttService: VttService,
    private readonly wsAuthMiddleware: WsAuthMiddleware,
    // --- [신규] MapAssetService 주입 ---
    private readonly mapAssetService: MapAssetService,
    // --- [신규 끝] ---
  ) {}

  afterInit(server: Server) {
    server.use(this.wsAuthMiddleware.createMiddleware());
  }

  handleConnection(client: Socket) {
    const user = client.data.user as jwtValidatedOutputDto;
    console.log(`✅ VTT client connected: ${client.id}, User: ${user.email}`);
  }

  handleDisconnect(client: Socket) {
    const user = client.data.user as jwtValidatedOutputDto;
    console.log(`VTT client disconnected: ${client.id}`);

    // connectedMaps에서 사용자 제거
    for (const [mapId, userSet] of this.connectedMaps.entries()) {
      if (userSet.delete(user.id) && userSet.size === 0) {
        this.connectedMaps.delete(mapId);
      }
    }

    // connectedRooms에서 사용자 제거
    for (const [roomId, userSet] of this.connectedRooms.entries()) {
      if (userSet.delete(user.id) && userSet.size === 0) {
        this.connectedRooms.delete(roomId);
      }
    }
  }

  // --- [수정 불필요] ---
  // ... (handleJoinRoom, handleLeaveRoom은 기존과 동일) ...
  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user as jwtValidatedOutputDto;
    const userId = user.id;
    const roomId = data.roomId;
    console.log(`[DEBUG] joinRoom called: roomId=${roomId}, userId=${userId}`);

    try {
      await this.vttService.validateParticipantAccess(roomId, userId);

      // 상태 등록
      if (!this.connectedRooms.has(roomId)) {
        this.connectedRooms.set(roomId, new Set());
      }
      this.connectedRooms.get(roomId)!.add(userId);

      client.join(`room-${roomId}`);
      client.emit('joinedRoom', { roomId });
      console.log(`[DEBUG] User ${userId} successfully joined room ${roomId}`);
    } catch (error) {
      console.error(
        `[ERROR] joinRoom failed for user ${userId}:`,
        error.message,
      );
      client.emit('error', { message: 'Cannot join room: ' + error.message });
      return;
    }
  }

  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user as jwtValidatedOutputDto;
    const userId = user.id;
    const roomId = data.roomId;

    const userSet = this.connectedRooms.get(roomId);
    if (userSet) {
      userSet.delete(userId);
      if (userSet.size === 0) {
        this.connectedRooms.delete(roomId);
      }
    }
    client.leave(`room-${roomId}`);
    client.emit('leftRoom', { roomId });
  }

  // --- [수정됨] ---
  // 프론트엔드 VttScene.fromJson이 필요로 하는
  // 모든 필드를 전송하도록 'map' 페이로드 수정
  @SubscribeMessage('joinMap')
  async handleJoinMap(
    @MessageBody() data: { mapId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user as jwtValidatedOutputDto;
    const userId = user.id;
    const { mapId } = data;
    console.log(`[DEBUG] joinMap called: mapId=${mapId}, userId=${userId}`);
    try {
      // 맵 정보 조회 + 권한 검증 (roomId 포함)
      // 'map' 변수는 VttMap Entity의 모든 속성을 포함합니다.
      const map = await this.vttService.getVttMapForUser(mapId, userId);
      const isJoinedRoom = this.connectedRooms.get(map.roomId)?.has(userId);

      console.log(
        `[DEBUG] isJoinedRoom check: roomId=${map.roomId}, result=${isJoinedRoom}`,
      );
      if (!isJoinedRoom) {
        console.warn(
          `[WARN] User ${userId} not in room ${map.roomId}, cannot join map`,
        );
        client.emit('error', { message: '먼저 방에 입장하세요.' });
        return;
      }

      // 상태 등록
      if (!this.connectedMaps.has(mapId)) {
        this.connectedMaps.set(mapId, new Set());
      }
      this.connectedMaps.get(mapId)!.add(userId);

      // Socket.IO 방 참여
      client.join(`map-${mapId}`); // 토큰/맵 설정 수신용

      // 전체 초기 상태: 맵 + 모든 토큰
      const tokens = await this.vttService.getTokensByMap(mapId, userId);

      // --- 🚨 [신규] MapAsset 목록 조회 ---
      const mapAssets = await this.mapAssetService.findAllByMapId(mapId);
      // --- 🚨 [신규 끝] ---

      // --- 🚨 [수정된 페이로드] ---
      // 프론트엔드 VttScene.fromJson이 모든 필드를 받을 수 있도록
      // 'map' 객체 전체를 전달하고, 호환성을 위해 'backgroundUrl'을 추가합니다.
      const frontendMapPayload = {
        ...map, // VttMap 엔티티의 모든 속성 (localWidth, localHeight, properties 등) 복사
        backgroundUrl: map.imageUrl ?? null, // 'imageUrl'을 'backgroundUrl'로 복사
      };

      client.emit('joinedMap', {
        map: frontendMapPayload, // 수정된 'map' 객체 전송
        tokens, // 전체 토큰 목록 포함
        mapAssets: mapAssets, // 🚨 [신규] 맵 에셋 목록 포함
      });
      // --- 🚨 [수정 끝] ---

      console.log(
        `✅ User ${userId} joined map ${mapId} with ${tokens.length} tokens and ${mapAssets.length} assets`,
      );
    } catch (error) {
      console.error('[joinMap] Error:', error);
      client.emit('error', { message: error.message || '맵 참가 실패' });
    }
  }

  // ... (handleLeaveMap, handleMapCreated, handleMapUpdated, handleMapDeleted는 기존과 동일) ...
  @OnEvent('map.created')
  handleMapCreated(event: MapCreatedEvent) {
    this.server.to(`room-${event.roomId}`).emit('mapCreated', event.map);
  }

  @OnEvent('map.updated')
  handleMapUpdated(event: MapUpdatedEvent) {
    // vttmap.service.ts에서 페이로드에 새 필드를 추가했으므로,
    // ...event.payload를 통해 자동으로 전파됨 (수정 필요 없음)
    this.server.to(`map-${event.mapId}`).emit('mapUpdated', {
      id: event.mapId, // [수정] VttScene.fromJson을 위해 id를 mapId 대신 사용
      ...event.payload,
    });
  }

  @OnEvent('map.deleted')
  handleMapDeleted(event: MapDeletedEvent) {
    this.server.to(`room-${event.roomId}`).emit('mapDeleted', {
      id: event.mapId,
    });
  }

  @SubscribeMessage('leaveMap')
  async handleLeaveMap(
    @MessageBody() data: { mapId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user as jwtValidatedOutputDto;
    const userId = user.id;
    const { mapId } = data;

    const userSet = this.connectedMaps.get(mapId);
    if (userSet) {
      userSet.delete(userId);
      if (userSet.size === 0) {
        this.connectedMaps.delete(mapId);
      }
    }

    client.leave(`map-${mapId}`);
    client.emit('leftMap', { mapId });
  }

  @SubscribeMessage('moveToken')
  async handleMoveToken(
    @MessageBody() dto: MoveTokenDto,
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user as jwtValidatedOutputDto;
    const userId = user.id;
    const { tokenId, x, y } = dto;

    try {
      // 1. 권한 체크 (토큰 존재 + 이동 권한)
      const token = await this.vttService.validateTokenMoveAccess(
        tokenId,
        userId,
      );

      // 2. 현재 맵에 접속 중인지 확인
      const isCurrentlyInMap = this.connectedMaps.get(token.mapId)?.has(userId);
      if (!isCurrentlyInMap) {
        client.emit('error', {
          message: TOKEN_ERROR_MESSAGES[TokenErrorCode.NOT_IN_ROOM],
        });
        return;
      }

      // 3. userId를 명시적으로 전달
      await this.vttService.moveToken(tokenId, { x, y }, userId);
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  // --- [신규] MapAsset Socket Handlers ---

  @SubscribeMessage('updateMapAsset')
  async handleUpdateMapAsset(
    @MessageBody() raw: any, // vtt_service.dart에서 보낸 payload
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // 1. 수동 유효성 검사 (handleUpdateMap 패턴을 따름) 
      if (!raw || typeof raw.assetId !== 'string') {
        throw new BadRequestException('Invalid assetId');
      }
      if (
        typeof raw.x !== 'number' ||
        typeof raw.y !== 'number' ||
        typeof raw.width !== 'number' ||
        typeof raw.height !== 'number'
      ) {
        throw new BadRequestException('Invalid asset transform data');
      }

      // 2. MapAssetService 호출 (vttService 아님)
      // [참고] MapAsset은 권한 검증이 필요 없으므로(요구사항 3) 바로 update 호출
      await this.mapAssetService.update(raw.assetId, {
        x: raw.x,
        y: raw.y,
        width: raw.width,
        height: raw.height,
      });
      // 3. 서비스가 'map_asset.updated' 이벤트를 발행하면
      // 아래 handleMapAssetUpdated 리스너가 잡아 브로드캐스트합니다.
    } catch (error) {
      console.error('[GW] update_map_asset error:', error);
      client.emit('error', {
        message: error.message || '맵 에셋 업데이트 실패',
      });
    }
  }

  @SubscribeMessage('deleteMapAsset')
  async handleDeleteMapAsset(
    @MessageBody() raw: any, // vtt_service.dart에서 보낸 payload
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // 1. 수동 유효성 검사
      if (!raw || typeof raw.assetId !== 'string') {
        throw new BadRequestException('Invalid assetId');
      }

      // 2. MapAssetService 호출 (vttService 아님)
      // [참고] MapAsset은 권한 검증이 필요 없으므로(요구사항 3) 바로 remove 호출
      await this.mapAssetService.remove(raw.assetId);

      // 3. 서비스가 'map_asset.deleted' 이벤트를 발행하면
      // 아래 handleMapAssetDeleted 리스너가 잡아 브로드캐스트합니다.
    } catch (error) {
      console.error('[GW] delete_map_asset error:', error);
      client.emit('error', {
        message: error.message || '맵 에셋 삭제 실패',
      });
    }
  }

  // --- [신규 끝] ---


  // --- [기존] Token Event Listeners ---
  @OnEvent('token.created')
  handleTokenCreated(event: TokenCreatedEvent) {
    console.log('[GW] Emitting token:created to room map-', event.mapId);
    this.server.to(`map-${event.mapId}`).emit('token:created', event.token);
  }

  @OnEvent('token.updated')
  handleTokenUpdated(event: TokenUpdatedEvent) {
    this.server.to(`map-${event.mapId}`).emit('token:updated', event.token);
  }

  @OnEvent('token.deleted')
  handleTokenDeleted(event: TokenDeletedEvent) {
    this.server
      .to(`map-${event.mapId}`)
      .emit('token:deleted', { id: event.tokenId });
  }
  // --- [기존 끝] ---


  // --- [신규] MapAsset Event Listeners (Token 리스너 패턴을 따름) ---

  @OnEvent(MAP_ASSET_EVENTS.CREATED)
  handleMapAssetCreated(event: MapAssetCreatedEvent) {
    // 프론트 vtt_socket_service.dart는 'map_asset_created'를 기다림
    this.server
      .to(`map-${event.mapAsset.mapId}`)
      .emit('map_asset_created', event.mapAsset);
  }

  @OnEvent(MAP_ASSET_EVENTS.UPDATED)
  handleMapAssetUpdated(event: MapAssetUpdatedEvent) {
    // 프론트 vtt_socket_service.dart는 'map_asset_updated'를 기다림
    this.server
      .to(`map-${event.mapAsset.mapId}`)
      .emit('map_asset_updated', event.mapAsset);
  }

  @OnEvent(MAP_ASSET_EVENTS.DELETED)
  handleMapAssetDeleted(event: MapAssetDeletedEvent) {
    // 프론트 vtt_socket_service.dart는 'map_asset_deleted'를 기다림
    // TokenDeletedEvent와 동일하게 { id: string } 객체 전송
    this.server
      .to(`map-${event.mapId}`)
      .emit('map_asset_deleted', { id: event.id });
  }

  // --- [신규 끝] ---


  @SubscribeMessage('updateMap')
  async handleUpdateMap(
    @MessageBody() raw: any, // plain object
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user as jwtValidatedOutputDto;
    const userId = user.id;

    try {
      // 1. 수동 유효성 검사
      if (!raw || typeof raw.mapId !== 'string') {
        throw new Error('Invalid mapId');
      }
      if (!raw.updates || typeof raw.updates !== 'object') {
        throw new Error('Invalid updates');
      }

      const { mapId, updates } = raw as UpdateMapMessage;

      // 3. 서비스 호출 (vttmap.service.ts의 updateVttMap)
      // 이 서비스가 'map.updated' 이벤트를 발생시킴
      await this.vttService.updateMap(mapId, updates, userId);
    } catch (error) {
      console.error('[GW] updateMap error:', error);
      client.emit('error', {
        message: error.message || 'Invalid updateMap payload',
      });
    }
  }
}