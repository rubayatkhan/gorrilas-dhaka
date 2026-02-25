import type Phaser from 'phaser';

export type PlayerIndex = 0 | 1;

export interface AimState {
  angle: number;
  power: number;
}

export interface HudState {
  round: number;
  currentPlayer: PlayerIndex;
  scores: [number, number];
  angle: number;
  power: number;
  wind: number;
  status: string;
}

export interface BuildingData {
  id: number;
  x: number;
  width: number;
  initialHeight: number;
  height: number;
  topY: number;
  baseY: number;
  health: number;
  maxHealth: number;
  baseColor: number;
  floorHeight: number;
  windowChance: number;
  columnTopWorldY: number[];
  columnWidth: number;
  body: Phaser.GameObjects.Rectangle;
  shell?: Phaser.GameObjects.Graphics;
  detail?: Phaser.GameObjects.Graphics;
  skin?: Phaser.GameObjects.Image;
}
