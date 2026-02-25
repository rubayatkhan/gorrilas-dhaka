export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const STREET_Y = 680;
export const GRAVITY = 320;
export const WIND_MIN = -90;
export const WIND_MAX = 90;

export const MIN_BUILDING_HEIGHT = 90;
export const MAX_BUILDING_HEIGHT = 430;

export const PLAYER_HIT_RADIUS = 16;
export const PROJECTILE_RADIUS = 6;
export const EXPLOSION_RADIUS = 58;

export const AIM_MIN_ANGLE = 15;
export const AIM_MAX_ANGLE = 85;
export const AIM_MIN_POWER = 240;
export const AIM_MAX_POWER = 860;

export const SCENE_KEYS = {
  BOOT: 'BootScene',
  GAME: 'GameScene',
  UI: 'UIScene'
} as const;
