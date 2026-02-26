import Phaser from 'phaser';
import { ART_USAGE, ASSET_KEYS } from '../assets';
import { gameEventBus, GAME_EVENT_HUD_UPDATE } from '../core/events';
import { PlayerActor } from '../entities/PlayerActor';
import {
  AIM_MAX_ANGLE,
  AIM_MAX_POWER,
  AIM_MIN_ANGLE,
  AIM_MIN_POWER,
  EXPLOSION_RADIUS,
  GAME_HEIGHT,
  GAME_WIDTH,
  GRAVITY,
  PROJECTILE_RADIUS,
  SCENE_KEYS,
  STREET_Y
} from '../constants';
import type { AimState, HudState, PlayerIndex } from '../types';
import type { MatchSetup } from '../types';
import { ProjectileSystem } from '../systems/ProjectileSystem';
import { TerrainSystem } from '../systems/TerrainSystem';
import { TurnSystem } from '../systems/TurnSystem';
import { WindSystem } from '../systems/WindSystem';

const ANGLE_SPEED = 56;
const POWER_SPEED = 280;
const MATCH_SETUP_REGISTRY_KEY = 'matchSetup';
const DEFAULT_MATCH_SETUP: MatchSetup = {
  playerNames: ['Player 1', 'Player 2'],
  targetScore: 3
};

export class GameScene extends Phaser.Scene {
  private terrain!: TerrainSystem;
  private projectile!: ProjectileSystem;
  private turnSystem!: TurnSystem;
  private windSystem!: WindSystem;
  private aimGuide!: Phaser.GameObjects.Graphics;

  private players: PlayerActor[] = [];

  private readonly aimByPlayer: [AimState, AimState] = [
    { angle: 52, power: 520 },
    { angle: 52, power: 520 }
  ];

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private fireKey!: Phaser.Input.Keyboard.Key;
  private resetRoundKey!: Phaser.Input.Keyboard.Key;
  private resetMatchKey!: Phaser.Input.Keyboard.Key;
  private setupKey!: Phaser.Input.Keyboard.Key;

  private roundLocked = false;
  private matchOver = false;
  private statusMessage = 'Adjust angle/power with arrow keys, SPACE to throw.';
  private matchSetup: MatchSetup = { ...DEFAULT_MATCH_SETUP };

  public constructor() {
    super(SCENE_KEYS.GAME);
  }

  public create(data?: { setup?: MatchSetup }): void {
    this.matchSetup = this.resolveMatchSetup(data?.setup);
    this.registry.set(MATCH_SETUP_REGISTRY_KEY, this.matchSetup);

    this.drawBackdrop();
    this.drawStreet();

    this.terrain = new TerrainSystem(this);
    this.projectile = new ProjectileSystem(this);
    this.turnSystem = new TurnSystem();
    this.windSystem = new WindSystem();

    this.createInput();
    this.aimGuide = this.add.graphics().setDepth(12);
    this.startRound(0);
  }

  public update(_: number, delta: number): void {
    const dt = delta / 1000;

    if (!this.projectile.isInFlight()) {
      this.processActionKeys();
    }

    if (!this.roundLocked && !this.projectile.isInFlight()) {
      this.processAimInput(dt);
    }

    if (this.projectile.isInFlight()) {
      this.projectile.update(dt, this.windSystem.getWind(), GRAVITY);
      this.resolveProjectileCollisions();
      this.aimGuide.clear();
    } else if (!this.roundLocked) {
      this.drawAimGuide();
    } else {
      this.aimGuide.clear();
    }
  }

  private createInput(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input plugin is required for GameScene.');
    }

    this.cursors = keyboard.createCursorKeys();
    this.fireKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.resetRoundKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.resetMatchKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    this.setupKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.N);
  }

  private startRound(startingPlayer: PlayerIndex): void {
    this.roundLocked = true;
    this.matchOver = false;
    this.projectile.clear();
    this.aimGuide.clear();

    this.terrain.generate();
    this.setupPlayers();

    this.turnSystem.startRound(startingPlayer);
    this.windSystem.rollNewWind();
    this.setActivePlayerHighlight();

    this.statusMessage = `Round ${this.turnSystem.getRound()} live. ${this.getPlayerName(startingPlayer)} starts.`;
    this.emitHud();

    this.time.delayedCall(250, () => {
      this.roundLocked = false;
      this.statusMessage = 'Adjust angle/power with arrow keys, SPACE to throw.';
      this.emitHud();
    });
  }

  private setupPlayers(): void {
    for (const player of this.players) {
      player.destroy();
    }
    this.players = [];

    const [leftSpawn, rightSpawn] = this.terrain.getSpawnPoints();

    const playerA = new PlayerActor(this, 0, 1, {
      label: this.getPlayerName(0),
      bodyColor: 0xff7a59,
      accentColor: 0xffdb8a
    });

    const playerB = new PlayerActor(this, 1, -1, {
      label: this.getPlayerName(1),
      bodyColor: 0x64a4ff,
      accentColor: 0xb4d8ff
    });

    playerA.setPosition(leftSpawn.x, leftSpawn.y);
    playerB.setPosition(rightSpawn.x, rightSpawn.y);

    this.players.push(playerA, playerB);
  }

  private processAimInput(dt: number): void {
    const playerIndex = this.turnSystem.getCurrentPlayer();
    const aim = this.getAimState(playerIndex);

    const angleDelta = Number(this.cursors.up.isDown) - Number(this.cursors.down.isDown);
    const powerDelta = Number(this.cursors.right.isDown) - Number(this.cursors.left.isDown);

    aim.angle = Phaser.Math.Clamp(aim.angle + angleDelta * ANGLE_SPEED * dt, AIM_MIN_ANGLE, AIM_MAX_ANGLE);
    aim.power = Phaser.Math.Clamp(aim.power + powerDelta * POWER_SPEED * dt, AIM_MIN_POWER, AIM_MAX_POWER);

    this.emitHud();
  }

  private processActionKeys(): void {
    if (Phaser.Input.Keyboard.JustDown(this.setupKey)) {
      this.scene.stop(SCENE_KEYS.UI);
      this.scene.start(SCENE_KEYS.SETUP);
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.fireKey)) {
      if (this.roundLocked || this.matchOver) {
        return;
      }
      this.fireProjectile();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.resetRoundKey)) {
      if (this.roundLocked || this.matchOver) {
        return;
      }
      const current = this.turnSystem.getCurrentPlayer();
      this.statusMessage = 'Round reset by player.';
      this.startRound(current);
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.resetMatchKey)) {
      this.turnSystem.resetMatch();
      this.aimByPlayer[0].angle = 52;
      this.aimByPlayer[0].power = 520;
      this.aimByPlayer[1].angle = 52;
      this.aimByPlayer[1].power = 520;
      this.matchOver = false;
      this.statusMessage = 'Match reset. Scores cleared.';
      this.startRound(0);
    }
  }

  private fireProjectile(): void {
    const playerIndex = this.turnSystem.getCurrentPlayer();
    const player = this.getPlayer(playerIndex);
    const aim = this.getAimState(playerIndex);

    player.playThrowAnimation();
    this.projectile.launch(player.getLaunchPoint(), aim.angle, aim.power, player.facing);
    this.aimGuide.clear();
    this.statusMessage = 'Banana in flight...';
    this.emitHud();
  }

  private resolveProjectileCollisions(): void {
    const projectilePosition = this.projectile.getPosition();

    if (
      projectilePosition.x < -50 ||
      projectilePosition.x > GAME_WIDTH + 50 ||
      projectilePosition.y < -80 ||
      projectilePosition.y > GAME_HEIGHT + 80
    ) {
      this.resolveMiss(projectilePosition.x, Phaser.Math.Clamp(projectilePosition.y, 40, STREET_Y));
      return;
    }

    for (let i = 0; i < this.players.length; i += 1) {
      const player = this.players[i];
      if (!player) {
        continue;
      }

      if (player.isHit(projectilePosition.x, projectilePosition.y, PROJECTILE_RADIUS)) {
        this.resolvePlayerHit(this.toPlayerIndex(i), projectilePosition.x, projectilePosition.y);
        return;
      }
    }

    if (
      projectilePosition.y >= STREET_Y ||
      this.terrain.collidesWithCircle(projectilePosition.x, projectilePosition.y, PROJECTILE_RADIUS)
    ) {
      this.resolveMiss(projectilePosition.x, Math.min(projectilePosition.y, STREET_Y));
    }
  }

  private resolveMiss(hitX: number, hitY: number): void {
    this.projectile.clear();
    this.spawnExplosion(hitX, hitY);
    this.terrain.applyExplosion(hitX, hitY);

    this.time.delayedCall(300, () => {
      this.turnSystem.nextTurn();
      this.windSystem.rollNewWind();
      this.setActivePlayerHighlight();
      this.statusMessage = `${this.getPlayerName(this.turnSystem.getCurrentPlayer())} turn.`;
      this.emitHud();
    });
  }

  private resolvePlayerHit(targetIndex: PlayerIndex, x: number, y: number): void {
    const shooter = this.turnSystem.getCurrentPlayer();
    this.projectile.clear();

    this.spawnExplosion(x, y);
    this.terrain.applyExplosion(x, y, EXPLOSION_RADIUS * 0.85);

    this.turnSystem.addScore(shooter);
    this.roundLocked = true;
    const scores = this.turnSystem.getScores();
    const shooterScore = scores[shooter];
    const otherPlayer = shooter === 0 ? 1 : 0;
    const otherScore = scores[otherPlayer];

    this.statusMessage = `Direct hit! ${this.getPlayerName(shooter)} scores.`;
    this.emitHud();

    if (shooterScore >= this.matchSetup.targetScore) {
      this.matchOver = true;
      this.statusMessage = `${this.getPlayerName(shooter)} wins ${shooterScore}-${otherScore}! Press M to replay or N for setup.`;
      this.emitHud();
      return;
    }

    this.time.delayedCall(1200, () => {
      this.startRound(targetIndex);
    });
  }

  private setActivePlayerHighlight(): void {
    const active = this.turnSystem.getCurrentPlayer();
    for (let i = 0; i < this.players.length; i += 1) {
      const player = this.players[i];
      if (!player) {
        continue;
      }

      player.setActive(i === active);
    }
  }

  private emitHud(): void {
    const currentPlayer = this.turnSystem.getCurrentPlayer();
    const activeAim = this.getAimState(currentPlayer);

    const hudState: HudState = {
      round: this.turnSystem.getRound(),
      currentPlayer,
      scores: this.turnSystem.getScores(),
      playerNames: [this.getPlayerName(0), this.getPlayerName(1)],
      targetScore: this.matchSetup.targetScore,
      matchOver: this.matchOver,
      angle: activeAim.angle,
      power: activeAim.power,
      wind: this.windSystem.getWind(),
      status: this.statusMessage
    };

    gameEventBus.emit(GAME_EVENT_HUD_UPDATE, hudState);
  }

  private getAimState(player: PlayerIndex): AimState {
    return this.aimByPlayer[player];
  }

  private getPlayer(player: PlayerIndex): PlayerActor {
    const actor = this.players[player];
    if (!actor) {
      throw new Error(`Player ${player + 1} is not initialized.`);
    }
    return actor;
  }

  private toPlayerIndex(value: number): PlayerIndex {
    return value === 0 ? 0 : 1;
  }

  private spawnExplosion(x: number, y: number): void {
    if (ART_USAGE.explosionSheet && this.textures.exists(ASSET_KEYS.EXPLOSION)) {
      const sprite = this.add.image(x, y, ASSET_KEYS.EXPLOSION).setDepth(19).setBlendMode(Phaser.BlendModes.ADD);
      const cropSize = Phaser.Math.Between(220, 420);
      const cropX = Phaser.Math.Between(0, 1024 - cropSize);
      const cropY = Phaser.Math.Between(0, 1024 - cropSize);
      sprite.setCrop(cropX, cropY, cropSize, cropSize);
      sprite.setDisplaySize(34, 34);
      sprite.setAlpha(0.95);

      this.tweens.add({
        targets: sprite,
        displayWidth: EXPLOSION_RADIUS * 2,
        displayHeight: EXPLOSION_RADIUS * 2,
        alpha: 0,
        duration: 360,
        onComplete: () => sprite.destroy()
      });
    }

    const flash = this.add.circle(x, y, 8, 0xfff6d5, 0.95).setDepth(20);
    const ring = this.add.circle(x, y, 8, 0xffa24d, 0.75).setDepth(19);
    const smoke = this.add.circle(x, y, 8, 0x665260, 0.5).setDepth(18);

    this.tweens.add({
      targets: flash,
      radius: 26,
      alpha: 0,
      duration: 200,
      onComplete: () => flash.destroy()
    });

    this.tweens.add({
      targets: ring,
      radius: EXPLOSION_RADIUS,
      alpha: 0,
      duration: 320,
      onComplete: () => ring.destroy()
    });

    this.tweens.add({
      targets: smoke,
      radius: EXPLOSION_RADIUS * 0.72,
      alpha: 0,
      duration: 520,
      onComplete: () => smoke.destroy()
    });

    this.cameras.main.shake(100, 0.0025);
  }

  private drawAimGuide(): void {
    this.aimGuide.clear();

    const playerIndex = this.turnSystem.getCurrentPlayer();
    const player = this.getPlayer(playerIndex);
    const aim = this.getAimState(playerIndex);
    const launchPoint = player.getLaunchPoint();
    const facing = player.facing;

    const angleRadians = Phaser.Math.DegToRad(aim.angle);
    const velocity = new Phaser.Math.Vector2(Math.cos(angleRadians) * aim.power * facing, -Math.sin(angleRadians) * aim.power);
    const position = launchPoint.clone();

    const wind = this.windSystem.getWind();
    const simStep = 0.06;
    const simSteps = 16;
    const samplePoints: Phaser.Math.Vector2[] = [position.clone()];

    for (let i = 0; i < simSteps; i += 1) {
      velocity.x += wind * simStep;
      velocity.y += GRAVITY * simStep;
      position.x += velocity.x * simStep;
      position.y += velocity.y * simStep;

      if (position.x < -24 || position.x > GAME_WIDTH + 24 || position.y < -40 || position.y > STREET_Y) {
        break;
      }

      samplePoints.push(position.clone());

      if (this.terrain.collidesWithCircle(position.x, position.y, 2)) {
        break;
      }
    }

    if (samplePoints.length < 2) {
      return;
    }

    const lineColor = playerIndex === 0 ? 0xffcf8c : 0xa7d5ff;
    const startPoint = samplePoints[0];
    if (!startPoint) {
      return;
    }

    this.aimGuide.lineStyle(2, lineColor, 0.85);
    this.aimGuide.beginPath();
    this.aimGuide.moveTo(startPoint.x, startPoint.y);

    for (let i = 1; i < samplePoints.length; i += 1) {
      const point = samplePoints[i];
      if (!point) {
        continue;
      }
      this.aimGuide.lineTo(point.x, point.y);
    }
    this.aimGuide.strokePath();

    this.aimGuide.fillStyle(lineColor, 0.8);
    for (let i = 1; i < samplePoints.length; i += 2) {
      const point = samplePoints[i];
      if (!point) {
        continue;
      }
      this.aimGuide.fillCircle(point.x, point.y, 2.1);
    }

    const tail = samplePoints[samplePoints.length - 2];
    const head = samplePoints[samplePoints.length - 1];
    if (tail && head) {
      const direction = new Phaser.Math.Vector2(head.x - tail.x, head.y - tail.y);
      if (direction.lengthSq() > 0.0001) {
        direction.normalize();
        const normal = new Phaser.Math.Vector2(-direction.y, direction.x);

        const arrowLength = 12;
        const arrowWidth = 4.5;
        const base = new Phaser.Math.Vector2(head.x - direction.x * arrowLength, head.y - direction.y * arrowLength);
        const wingA = new Phaser.Math.Vector2(base.x + normal.x * arrowWidth, base.y + normal.y * arrowWidth);
        const wingB = new Phaser.Math.Vector2(base.x - normal.x * arrowWidth, base.y - normal.y * arrowWidth);

        this.aimGuide.fillStyle(lineColor, 0.92);
        this.aimGuide.fillTriangle(head.x, head.y, wingA.x, wingA.y, wingB.x, wingB.y);
      }
    }
  }

  private drawBackdrop(): void {
    if (ART_USAGE.skylineBackdrop && this.textures.exists(ASSET_KEYS.SKYLINE)) {
      this.add.image(0, 0, ASSET_KEYS.SKYLINE).setOrigin(0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setDepth(0);
      this.add.rectangle(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.5, GAME_WIDTH, GAME_HEIGHT, 0x121f3f, 0.28).setDepth(0.5);
      return;
    }

    const gradient = this.add.graphics();

    gradient.fillGradientStyle(0x0e1733, 0x1d2744, 0x415074, 0x2f4268, 1, 1, 1, 1);
    gradient.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    gradient.fillStyle(0xf7a05b, 0.22);
    gradient.fillCircle(980, 130, 92);

    gradient.fillStyle(0xdbe6ff, 0.14);
    gradient.fillCircle(260, 115, 72);

    for (let i = 0; i < 12; i += 1) {
      const cloud = this.add.ellipse(
        Phaser.Math.Between(80, GAME_WIDTH - 80),
        Phaser.Math.Between(70, 230),
        Phaser.Math.Between(130, 240),
        Phaser.Math.Between(25, 58),
        0xd0ddff,
        0.08
      );
      cloud.setDepth(1);
    }
  }

  private drawStreet(): void {
    this.add.rectangle(
      GAME_WIDTH * 0.5,
      STREET_Y + (GAME_HEIGHT - STREET_Y) * 0.5,
      GAME_WIDTH,
      GAME_HEIGHT - STREET_Y,
      0x18171f,
      1
    );
    this.add.rectangle(GAME_WIDTH * 0.5, STREET_Y, GAME_WIDTH, 2, 0x7f86a0, 0.45).setDepth(3);
  }

  private getPlayerName(player: PlayerIndex): string {
    return this.matchSetup.playerNames[player];
  }

  private resolveMatchSetup(incoming?: MatchSetup): MatchSetup {
    const registrySetup = this.registry.get(MATCH_SETUP_REGISTRY_KEY) as MatchSetup | undefined;
    const source = incoming ?? registrySetup ?? DEFAULT_MATCH_SETUP;

    const p1 = source.playerNames?.[0]?.trim() || DEFAULT_MATCH_SETUP.playerNames[0];
    const p2 = source.playerNames?.[1]?.trim() || DEFAULT_MATCH_SETUP.playerNames[1];
    const targetScore = Phaser.Math.Clamp(Math.round(source.targetScore || DEFAULT_MATCH_SETUP.targetScore), 1, 15);

    return {
      playerNames: [p1, p2],
      targetScore
    };
  }
}
