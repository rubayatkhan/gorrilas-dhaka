# Gorrilas Dhaka - Project Context

## Goal
Build a modern remake of the classic QBasic `GORILLAS.BAS` game using Phaser (v1), visually set in Dhaka.

## Core Vision
- Keep classic turn-based banana artillery gameplay.
- Add modern visuals/effects and smoother UX.
- Make the setting distinctly Dhaka (skyline, signage motifs, atmosphere, color palettes, ambient sound cues).
- Keep it fun for kids (12-13), local multiplayer first.

## Agreed Direction
- Engine: Phaser + TypeScript (web-first prototype).
- Start with a playable MVP, then polish.
- Generate artwork using the `imagegen` skill workflow.
- Potential future migration to Godot after Phaser proof-of-fun.

## MVP Scope (Phase 1)
1. Two-player hot-seat gameplay.
2. Rooftop positions on a procedural city skyline.
3. Projectile physics (angle, power, gravity, wind).
4. Collision + explosions + building damage.
5. Round win condition + restart flow.
6. Basic HUD (current player, wind, power, angle, score).

## Dhaka Art Direction (Phase 2)
- Layered skyline with dense rooftops, tanks, cables, signs.
- Time-of-day themes: warm haze afternoon, monsoon dusk, neon night.
- Stylized landmark silhouettes inspired by Dhaka architecture.
- UI accents inspired by rickshaw art / Bengali pattern motifs.

## Kid-Fun Ideas (Priority Features)
1. Power-ups: split banana, sticky banana, wind shield, mega blast.
2. Character skins: playful outfits and unlockable banana trails.
3. Dynamic events: sudden gust, light rain, kite obstacle, rooftop bird flocks.
4. Party mode: short best-of-3 rounds with mini modifiers each round.
5. Assist mode: optional predicted arc hint for younger players.
6. Challenges: "Hit in 2 shots", "Bank shot", "No direct line".

## Asset Generation Notes
- Intended skill: `imagegen`.
- In this session, `OPENAI_API_KEY` was not set, so generation was not started.
- On next session, set key and generate assets via bundled CLI workflow.

## Constraints / Preferences
- Keep this work isolated from existing `Mirror` project files.
- Maintain a clean standalone folder for easy move to a new repo/location.

## Suggested Build Order
1. Scaffold Phaser + TypeScript project.
2. Implement physics + turn loop with placeholder art.
3. Integrate generated Dhaka assets.
4. Add juice/polish (particles, shake, weather, sound).
5. Add kid-focused modes and power-ups.
