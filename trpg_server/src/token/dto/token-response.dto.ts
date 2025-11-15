export class TokenResponseDto {
  id: string;
  mapId: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  imageUrl?: string;
  characterSheetId: number | null;
  npcId: number | null;
}
