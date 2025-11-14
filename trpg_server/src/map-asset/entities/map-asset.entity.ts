import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
// VttMap을 올바르게 import 하는지 확인 (오타 주의: VttMap)
import { VttMap } from '../../vttmap/entities/vttmap.entity';

/**
 * VTT 캔버스에 업로드된 이미지(소품, 배경 등)를 나타내는 엔티티입니다.
 */
@Entity()
export class MapAsset {  // <--- 🚨 여기에 'export'가 반드시 있어야 합니다!
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * 이 에셋이 속한 VTT 맵 ID.
   * onDelete: 'SET NULL'을 위해 nullable: true로 설정합니다.
   */
  @Column({ type: 'uuid', nullable: true })
  mapId: string;

  /**
   * S3 등에 업로드된 이미지의 전체 URL
   */
  @Column({ type: 'varchar', length: 2048 })
  url: string;

  /**
   * 캔버스 내 X 좌표
   */
  @Column({ type: 'float', default: 0.0 })
  x: number;

  /**
   * 캔버스 내 Y 좌표
   */
  @Column({ type: 'float', default: 0.0 })
  y: number;

  /**
   * 이미지 너비
   */
  @Column({ type: 'float', default: 100.0 })
  width: number;

  /**
   * 이미지 높이
   */
  @Column({ type: 'float', default: 100.0 })
  height: number;

  /**
   * 이 에셋이 속한 VTT 맵 (N:1 관계)
   */
  @ManyToOne(() => VttMap, (vttmap) => vttmap.assets, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'mapId' })
  map: VttMap;
}