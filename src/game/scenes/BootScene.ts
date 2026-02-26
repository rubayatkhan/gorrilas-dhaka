import Phaser from 'phaser';
import { ASSET_KEYS, ASSET_PATHS } from '../assets';
import { SCENE_KEYS } from '../constants';

export class BootScene extends Phaser.Scene {
  public constructor() {
    super(SCENE_KEYS.BOOT);
  }

  public preload(): void {
    this.load.image(ASSET_KEYS.SKYLINE, ASSET_PATHS.SKYLINE);
    this.load.image(ASSET_KEYS.BUILDINGS, ASSET_PATHS.BUILDINGS);
    this.load.image(ASSET_KEYS.CHARACTERS, ASSET_PATHS.CHARACTERS);
    this.load.image(ASSET_KEYS.PLAYER_ONE, ASSET_PATHS.PLAYER_ONE);
    this.load.image(ASSET_KEYS.PLAYER_TWO, ASSET_PATHS.PLAYER_TWO);
    this.load.image(ASSET_KEYS.EXPLOSION, ASSET_PATHS.EXPLOSION);
    this.load.image(ASSET_KEYS.HUD_PANEL, ASSET_PATHS.HUD_PANEL);
  }

  public create(): void {
    this.scene.start(SCENE_KEYS.SETUP);
  }
}
