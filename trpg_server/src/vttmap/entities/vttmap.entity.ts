import { GridType } from '@/common/enums/grid-type.enum';
import { Room } from '@/room/entities/room.entity';
import { Token } from '@/token/entities/token.entity';
import { MapAsset } from '@/map-asset/entities/map-asset.entity'; // [신규] MapAsset import
import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class VttMap {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({
    type: 'enum',
    enum: GridType,
    default: GridType.SQUARE,
  })
  gridType: GridType;

  @Column({ type: 'int', default: 50 })
  gridSize: number;

  @Column({ type: 'boolean', default: true })
  showGrid: boolean;

  // --- [수정] 맵 크기 필드 추가 ---
  // 이 필드들은 프론트엔드의 VttScene.fromJson(j['width'], j['height'])에서 사용됩니다.

  @ApiProperty({ description: '맵 너비', default: 1000 })
  @Column({ type: 'int', nullable: false, default: 1000 })
  width: number;

  @ApiProperty({ description: '맵 높이', default: 800 })
  @Column({ type: 'int', nullable: false, default: 800 })
  height: number;

  // --- [여기까지 수정된 부분] ---

  // --- [신규] 배경 이미지 변형(Transform) 필드 ---

  @ApiProperty({ description: '배경 이미지 스케일', default: 1.0 })
  @Column({ type: 'float', default: 1.0 })
  imageScale: number;

  @ApiProperty({ description: '배경 이미지 X 오프셋', default: 0 })
  @Column({ type: 'float', default: 0 })
  imageX: number;

  @ApiProperty({ description: '배경 이미지 Y 오프셋', default: 0 })
  @Column({ type: 'float', default: 0 })
  imageY: number;

  // --- [여기까지 신규 필드] ---

  @ManyToOne(() => Room, (room) => room.vttmaps)
  @JoinColumn({ name: 'roomId' })
  room: Room;

  @Column({ type: 'uuid' })
  roomId: string;

  @OneToMany(() => Token, (token) => token.map)
  tokens: Token[];

  // --- [신규] MapAsset (1:N) 관계 추가 ---
  // map-asset.entity.ts의 @ManyToOne과 연결됩니다.
  @OneToMany(() => MapAsset, (asset) => asset.map)
  assets: MapAsset[];
  // --- [신규 끝] ---

  @ApiProperty({ description: '생성 시간' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: '수정 시간' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ApiProperty({ description: '삭제 시간 (null이면 활성)' })
  @DeleteDateColumn()
  deletedAt: Date | null;
}