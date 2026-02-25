import Phaser from 'phaser';

export const GAME_EVENT_HUD_UPDATE = 'game:hud-update';

export const gameEventBus = new Phaser.Events.EventEmitter();
