import { Injectable } from '@nestjs/common';
import { CreateTokenDto } from './dto/create-token.dto';
import { UpdateTokenDto } from './dto/update-token.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Token } from './entities/token.entity';
import { Repository } from 'typeorm';
import { TokenValidatorService } from './token-validator.service';
import { TokenResponseDto } from './dto/token-response.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TokenCreatedEvent } from './events/token-created.event';
import { TokenUpdatedEvent } from './events/token-updated.event';
import { TokenDeletedEvent } from './events/token-deleted.event';
import { TOKEN_EVENTS } from './constants/events';

@Injectable()
export class TokenService {
  constructor(
    @InjectRepository(Token)
    private readonly tokenRepository: Repository<Token>,
    private readonly validator: TokenValidatorService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * 🚨 [수정됨] 🚨
   * Token 엔티티를 프론트엔드로 보낼 DTO로 변환합니다.
   * width와 height를 포함하도록 수정되었습니다.
   */
  private toResponseDto(token: Token): TokenResponseDto {
    return {
      id: token.id,
      mapId: token.mapId,
      name: token.name,
      x: token.x,
      y: token.y,
      scale: token.scale, // (참고: 이 scale은 아마도 사용되지 않을 것입니다)
      imageUrl: token.imageUrl,
      characterSheetId: token.characterSheetId,
      npcId: token.npcId,
      // --- 🚨 [추가된 부분] ---
      width: token.width,
      height: token.height,
      // --- 🚨 [추가 끝] ---
    };
  }

  async createToken(
    mapId: string,
    dto: CreateTokenDto, // (참고: CreateTokenDto에도 width, height가 있어야 합니다)
    userId: number,
  ): Promise<TokenResponseDto> {
    this.validator.validateOwnershipRelation(dto);
    await this.validator.validateCreateAccess(mapId, dto, userId);

    const token = this.tokenRepository.create({
      mapId,
      name: dto.name,
      x: dto.x,
      y: dto.y,
      // --- 🚨 [수정된 부분] ---
      // DTO에 값이 없으면 엔티티의 기본값(50)을 사용합니다.
      width: dto.width ?? 50.0,
      height: dto.height ?? 50.0,
      // --- 🚨 [수정 끝] ---
      scale: dto.scale ?? 1.0,
      imageUrl: dto.imageUrl,
      characterSheetId: dto.characterSheetId,
      npcId: dto.npcId,
    });

    console.log('[DEBUG] createToken - token to save:', token);

    const saved = await this.tokenRepository.save(token);
    const responseDto = this.toResponseDto(saved);

    this.eventEmitter.emit(
      TOKEN_EVENTS.CREATED,
      new TokenCreatedEvent(mapId, responseDto),
    );

    console.log('[DEBUG] createToken - saved token:', saved);
    return responseDto;
  }

  async updateToken(
    tokenId: string,
    dto: UpdateTokenDto,
    userId: number,
  ): Promise<TokenResponseDto> {
    const token = await this.validator.validateMoveOrDeleteAccess(
      tokenId,
      userId,
    );

    // --- 🚨 [수정됨] ---
    // Object.assign(token, dto); // 👈 위험한 코드 제거
    
    // DTO에 명시적으로 포함된 값만 안전하게 업데이트합니다.
    if (dto.name !== undefined) token.name = dto.name;
    if (dto.x !== undefined) token.x = dto.x;
    if (dto.y !== undefined) token.y = dto.y;
    if (dto.width !== undefined) token.width = dto.width;
    if (dto.height !== undefined) token.height = dto.height;
    if (dto.scale !== undefined) token.scale = dto.scale;
    if (dto.imageUrl !== undefined) token.imageUrl = dto.imageUrl;
    // --- 🚨 [수정 끝] ---

    const updated = await this.tokenRepository.save(token);
    
    // 🚨 [수정됨] 
    // toResponseDto가 이제 width/height를 포함하므로
    // responseDto도 완전한 데이터를 가집니다.
    const responseDto = this.toResponseDto(updated);

    this.eventEmitter.emit(
      TOKEN_EVENTS.UPDATED,
      new TokenUpdatedEvent(token.mapId, responseDto),
    );

    return responseDto;
  }

  async getTokensByMap(
    mapId: string,
    userId: number,
  ): Promise<TokenResponseDto[]> {
    await this.validator.validateMapAccess(mapId, userId);
    const tokens = await this.tokenRepository.find({ where: { mapId } });
    console.log('[DEBUG] getTokensByMap - raw tokens from DB:', tokens);

    // 🚨 [수정됨] 
    // toResponseDto가 width/height를 포함하므로
    // responseDtos도 완전한 데이터를 가집니다.
    const responseDtos = tokens.map((t) => this.toResponseDto(t));
    console.log('[DEBUG] getTokensByMap - response DTOs:', responseDtos);
    return responseDtos;
  }

  async deleteToken(tokenId: string, userId: number): Promise<void> {
    const token = await this.validator.validateMoveOrDeleteAccess(
      tokenId,
      userId,
    );
    await this.tokenRepository.softRemove(token);

    this.eventEmitter.emit(
      TOKEN_EVENTS.DELETED,
      new TokenDeletedEvent(token.mapId, tokenId),
    );
  }

  //vtt gateway에서 token을 받아올때 사용한다
  async getTokensByMapForUser(
    mapId: string,
    userId: number,
  ): Promise<TokenResponseDto[]> {
    await this.validator.validateMapAccess(mapId, userId);
    const tokens = await this.tokenRepository.find({
      where: { mapId },
    });
    // 🚨 [수정됨]
    // toResponseDto가 width/height를 포함합니다.
    return tokens.map((t) => this.toResponseDto(t));
  }
}