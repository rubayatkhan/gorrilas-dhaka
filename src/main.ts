import Phaser from 'phaser';
import './style.css';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from './game/constants';
import { BootScene } from './game/scenes/BootScene';
import { GameScene } from './game/scenes/GameScene';
import { SetupScene } from './game/scenes/SetupScene';
import { UIScene } from './game/scenes/UIScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0d1630',
  scene: [BootScene, SetupScene, GameScene, UIScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

new Phaser.Game(config);

// Keep scene keys accessible from browser devtools while tuning gameplay.
void SCENE_KEYS;
