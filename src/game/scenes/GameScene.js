import Phaser from 'phaser';
import { ART_USAGE, ASSET_KEYS } from '../assets';
import { gameEventBus, GAME_EVENT_HUD_UPDATE } from '../core/events';
import { PlayerActor } from '../entities/PlayerActor';
import { AIM_MAX_ANGLE, AIM_MAX_POWER, AIM_MIN_ANGLE, AIM_MIN_POWER, EXPLOSION_RADIUS, GAME_HEIGHT, GAME_WIDTH, GRAVITY, PROJECTILE_RADIUS, SCENE_KEYS, STREET_Y } from '../constants';
import { ProjectileSystem } from '../systems/ProjectileSystem';
import { TerrainSystem } from '../systems/TerrainSystem';
import { TurnSystem } from '../systems/TurnSystem';
import { WindSystem } from '../systems/WindSystem';
const ANGLE_SPEED = 56;
const POWER_SPEED = 280;
export class GameScene extends Phaser.Scene {
    terrain;
    projectile;
    turnSystem;
    windSystem;
    players = [];
    aimByPlayer = [
        { angle: 52, power: 520 },
        { angle: 52, power: 520 }
    ];
    cursors;
    fireKey;
    resetRoundKey;
    resetMatchKey;
    roundLocked = false;
    statusMessage = 'Adjust angle/power with arrow keys, SPACE to throw.';
    constructor() {
        super(SCENE_KEYS.GAME);
    }
    create() {
        this.drawBackdrop();
        this.drawStreet();
        this.terrain = new TerrainSystem(this);
        this.projectile = new ProjectileSystem(this);
        this.turnSystem = new TurnSystem();
        this.windSystem = new WindSystem();
        this.createInput();
        this.startRound(0);
    }
    update(_, delta) {
        const dt = delta / 1000;
        if (!this.roundLocked && !this.projectile.isInFlight()) {
            this.processAimInput(dt);
            this.processActionKeys();
        }
        if (this.projectile.isInFlight()) {
            this.projectile.update(dt, this.windSystem.getWind(), GRAVITY);
            this.resolveProjectileCollisions();
        }
    }
    createInput() {
        const keyboard = this.input.keyboard;
        if (!keyboard) {
            throw new Error('Keyboard input plugin is required for GameScene.');
        }
        this.cursors = keyboard.createCursorKeys();
        this.fireKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.resetRoundKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
        this.resetMatchKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    }
    startRound(startingPlayer) {
        this.roundLocked = true;
        this.projectile.clear();
        this.terrain.generate();
        this.setupPlayers();
        this.turnSystem.startRound(startingPlayer);
        this.windSystem.rollNewWind();
        this.setActivePlayerHighlight();
        this.statusMessage = `Round ${this.turnSystem.getRound()} live. Player ${startingPlayer + 1} starts.`;
        this.emitHud();
        this.time.delayedCall(250, () => {
            this.roundLocked = false;
            this.statusMessage = 'Adjust angle/power with arrow keys, SPACE to throw.';
            this.emitHud();
        });
    }
    setupPlayers() {
        for (const player of this.players) {
            player.destroy();
        }
        this.players = [];
        const [leftSpawn, rightSpawn] = this.terrain.getSpawnPoints();
        const playerA = new PlayerActor(this, 0, 1, {
            label: 'P1',
            bodyColor: 0xff7a59,
            accentColor: 0xffdb8a
        });
        const playerB = new PlayerActor(this, 1, -1, {
            label: 'P2',
            bodyColor: 0x64a4ff,
            accentColor: 0xb4d8ff
        });
        playerA.setPosition(leftSpawn.x, leftSpawn.y);
        playerB.setPosition(rightSpawn.x, rightSpawn.y);
        this.players.push(playerA, playerB);
    }
    processAimInput(dt) {
        const playerIndex = this.turnSystem.getCurrentPlayer();
        const aim = this.getAimState(playerIndex);
        const angleDelta = Number(this.cursors.up.isDown) - Number(this.cursors.down.isDown);
        const powerDelta = Number(this.cursors.right.isDown) - Number(this.cursors.left.isDown);
        aim.angle = Phaser.Math.Clamp(aim.angle + angleDelta * ANGLE_SPEED * dt, AIM_MIN_ANGLE, AIM_MAX_ANGLE);
        aim.power = Phaser.Math.Clamp(aim.power + powerDelta * POWER_SPEED * dt, AIM_MIN_POWER, AIM_MAX_POWER);
        this.emitHud();
    }
    processActionKeys() {
        if (Phaser.Input.Keyboard.JustDown(this.fireKey)) {
            this.fireProjectile();
            return;
        }
        if (Phaser.Input.Keyboard.JustDown(this.resetRoundKey)) {
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
            this.statusMessage = 'Match reset. Scores cleared.';
            this.startRound(0);
        }
    }
    fireProjectile() {
        const playerIndex = this.turnSystem.getCurrentPlayer();
        const player = this.getPlayer(playerIndex);
        const aim = this.getAimState(playerIndex);
        player.playThrowAnimation();
        this.projectile.launch(player.getLaunchPoint(), aim.angle, aim.power, player.facing);
        this.statusMessage = 'Banana in flight...';
        this.emitHud();
    }
    resolveProjectileCollisions() {
        const projectilePosition = this.projectile.getPosition();
        if (projectilePosition.x < -50 ||
            projectilePosition.x > GAME_WIDTH + 50 ||
            projectilePosition.y < -80 ||
            projectilePosition.y > GAME_HEIGHT + 80) {
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
        if (projectilePosition.y >= STREET_Y ||
            this.terrain.collidesWithCircle(projectilePosition.x, projectilePosition.y, PROJECTILE_RADIUS)) {
            this.resolveMiss(projectilePosition.x, Math.min(projectilePosition.y, STREET_Y));
        }
    }
    resolveMiss(hitX, hitY) {
        this.projectile.clear();
        this.spawnExplosion(hitX, hitY);
        this.terrain.applyExplosion(hitX, hitY);
        this.time.delayedCall(300, () => {
            this.turnSystem.nextTurn();
            this.windSystem.rollNewWind();
            this.setActivePlayerHighlight();
            this.statusMessage = `Player ${this.turnSystem.getCurrentPlayer() + 1} turn.`;
            this.emitHud();
        });
    }
    resolvePlayerHit(targetIndex, x, y) {
        const shooter = this.turnSystem.getCurrentPlayer();
        this.projectile.clear();
        this.spawnExplosion(x, y);
        this.terrain.applyExplosion(x, y, EXPLOSION_RADIUS * 0.85);
        this.turnSystem.addScore(shooter);
        this.roundLocked = true;
        this.statusMessage = `Direct hit! Player ${shooter + 1} scores.`;
        this.emitHud();
        this.time.delayedCall(1200, () => {
            this.startRound(targetIndex);
        });
    }
    setActivePlayerHighlight() {
        const active = this.turnSystem.getCurrentPlayer();
        for (let i = 0; i < this.players.length; i += 1) {
            const player = this.players[i];
            if (!player) {
                continue;
            }
            player.setActive(i === active);
        }
    }
    emitHud() {
        const currentPlayer = this.turnSystem.getCurrentPlayer();
        const activeAim = this.getAimState(currentPlayer);
        const hudState = {
            round: this.turnSystem.getRound(),
            currentPlayer,
            scores: this.turnSystem.getScores(),
            angle: activeAim.angle,
            power: activeAim.power,
            wind: this.windSystem.getWind(),
            status: this.statusMessage
        };
        gameEventBus.emit(GAME_EVENT_HUD_UPDATE, hudState);
    }
    getAimState(player) {
        return this.aimByPlayer[player];
    }
    getPlayer(player) {
        const actor = this.players[player];
        if (!actor) {
            throw new Error(`Player ${player + 1} is not initialized.`);
        }
        return actor;
    }
    toPlayerIndex(value) {
        return value === 0 ? 0 : 1;
    }
    spawnExplosion(x, y) {
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
    drawBackdrop() {
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
            const cloud = this.add.ellipse(Phaser.Math.Between(80, GAME_WIDTH - 80), Phaser.Math.Between(70, 230), Phaser.Math.Between(130, 240), Phaser.Math.Between(25, 58), 0xd0ddff, 0.08);
            cloud.setDepth(1);
        }
    }
    drawStreet() {
        this.add.rectangle(GAME_WIDTH * 0.5, STREET_Y + (GAME_HEIGHT - STREET_Y) * 0.5, GAME_WIDTH, GAME_HEIGHT - STREET_Y, 0x18171f, 1);
        this.add.rectangle(GAME_WIDTH * 0.5, STREET_Y, GAME_WIDTH, 2, 0x7f86a0, 0.45).setDepth(3);
    }
}
