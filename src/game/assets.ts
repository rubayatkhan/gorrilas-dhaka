const BASE = import.meta.env.BASE_URL;

export const ASSET_KEYS = {
  SKYLINE: 'generated-skyline',
  BUILDINGS: 'generated-buildings',
  CHARACTERS: 'generated-characters',
  PLAYER_ONE: 'generated-player-one',
  PLAYER_TWO: 'generated-player-two',
  EXPLOSION: 'generated-explosion',
  HUD_PANEL: 'generated-hud-panel'
} as const;

export const ASSET_PATHS = {
  SKYLINE: `${BASE}assets/generated/skyline.png`,
  BUILDINGS: `${BASE}assets/generated/buildings.png`,
  CHARACTERS: `${BASE}assets/generated/characters.png`,
  PLAYER_ONE: `${BASE}assets/generated/player1-sprite.png`,
  PLAYER_TWO: `${BASE}assets/generated/player2-sprite.png`,
  EXPLOSION: `${BASE}assets/generated/explosion-sheet.png`,
  HUD_PANEL: `${BASE}assets/generated/hud-panel.png`
} as const;

export const ART_USAGE = {
  skylineBackdrop: true,
  buildingSkins: false,
  characterSkins: false,
  explosionSheet: true,
  hudPanel: false
} as const;
