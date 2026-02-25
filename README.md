# Gorrilas Dhaka (Phaser + TypeScript MVP)

Playable hot-seat artillery prototype inspired by QBasic GORILLAS, set up for a Dhaka-themed art pass.

## What is implemented
- Two-player hot-seat turn loop.
- Angle/power/wind projectile physics.
- Procedural skyline/building generation.
- Destructible buildings via explosion damage.
- Projectile collision + explosion feedback.
- Round reset after a hit, with persistent score.
- Minimal HUD with round, turn, angle, power, wind, and controls.

## Tech stack
- Vite + TypeScript
- Phaser 3

## Run locally
```bash
npm install
npm run dev
```

Build check:
```bash
npm run build
```

## Controls
- `Arrow Up/Down`: adjust throw angle
- `Arrow Left/Right`: adjust throw power
- `Space`: throw banana
- `R`: reset current round
- `M`: reset full match (clears score)

## Game architecture
- `BootScene`: starts gameplay and HUD scenes.
- `GameScene`: simulation loop, turns, wind, terrain destruction, collisions.
- `UIScene`: HUD rendering and controls legend.
- `TerrainSystem`: skyline generation + destructible building updates.
- `ProjectileSystem`: projectile integration and trail.
- `TurnSystem`: current turn, rounds, score.
- `WindSystem`: wind acceleration per turn.
- `PlayerActor`: lightweight player entity with launch/hit helpers.

## Image generation pipeline (Dhaka assets)
This repo is wired to the shared image CLI from the `imagegen` skill.

1. Ensure API key is set locally:
```bash
export OPENAI_API_KEY="<set-in-shell-profile>"
```
2. Dry run batch (no API call):
```bash
npm run imagegen:dry
```
3. Generate assets batch:
```bash
npm run imagegen:batch
```
If `openai` isn't installed in your active Python, use:
```bash
npm run imagegen:batch:uv
```

Prompt batch file: `prompts/imagegen-batch.jsonl`

Outputs: `output/imagegen/`

## Next extension points
- Power-up registry (`split`, `sticky`, `wind shield`) as projectile modifiers.
- Online mode prep by separating deterministic simulation from input transport.
- Asset swap: replace placeholder primitives with generated skyline/character/UI/FX sprites.
