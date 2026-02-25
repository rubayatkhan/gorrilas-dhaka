import Phaser from 'phaser';
import { PROJECTILE_RADIUS } from '../constants';

const BOOMERANG_TEXTURE_KEY = 'projectile-boomerang';
const BOOMERANG_SPIN_DEGREES_PER_SECOND = 1020;

export class ProjectileSystem {
  private readonly scene: Phaser.Scene;
  private projectile?: Phaser.GameObjects.Image;
  private trail?: Phaser.GameObjects.Graphics;
  private readonly position = new Phaser.Math.Vector2();
  private readonly velocity = new Phaser.Math.Vector2();
  private inFlight = false;
  private spinDirection = 1;

  public constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.ensureBoomerangTexture();
  }

  public launch(origin: Phaser.Math.Vector2, angleDegrees: number, power: number, facing: -1 | 1): void {
    this.clear();

    this.projectile = this.scene.add.image(origin.x, origin.y, BOOMERANG_TEXTURE_KEY).setDepth(15);
    this.projectile.setDisplaySize(PROJECTILE_RADIUS * 5, PROJECTILE_RADIUS * 2.5);
    this.projectile.setAngle(Phaser.Math.Between(0, 359));
    this.trail = this.scene.add.graphics().setDepth(14);

    const angleRadians = Phaser.Math.DegToRad(angleDegrees);

    this.position.set(origin.x, origin.y);
    this.velocity.set(Math.cos(angleRadians) * power * facing, -Math.sin(angleRadians) * power);
    this.spinDirection = facing;
    this.inFlight = true;
  }

  public update(deltaSeconds: number, windAcceleration: number, gravityAcceleration: number): void {
    if (!this.inFlight || !this.projectile || !this.trail) {
      return;
    }

    const previousX = this.position.x;
    const previousY = this.position.y;

    this.velocity.x += windAcceleration * deltaSeconds;
    this.velocity.y += gravityAcceleration * deltaSeconds;

    this.position.x += this.velocity.x * deltaSeconds;
    this.position.y += this.velocity.y * deltaSeconds;

    this.projectile.setPosition(this.position.x, this.position.y);
    this.projectile.angle += BOOMERANG_SPIN_DEGREES_PER_SECOND * deltaSeconds * this.spinDirection;

    this.trail.lineStyle(2, 0xfef3ab, 0.5);
    this.trail.beginPath();
    this.trail.moveTo(previousX, previousY);
    this.trail.lineTo(this.position.x, this.position.y);
    this.trail.strokePath();
  }

  public getPosition(): Phaser.Math.Vector2 {
    return this.position.clone();
  }

  public isInFlight(): boolean {
    return this.inFlight;
  }

  public clear(): void {
    this.inFlight = false;
    this.projectile?.destroy();
    this.trail?.destroy();
    this.projectile = undefined;
    this.trail = undefined;
  }

  private ensureBoomerangTexture(): void {
    if (this.scene.textures.exists(BOOMERANG_TEXTURE_KEY)) {
      return;
    }

    const g = this.scene.add.graphics();
    g.setVisible(false);

    const points = [
      new Phaser.Geom.Point(4, 17),
      new Phaser.Geom.Point(16, 5),
      new Phaser.Geom.Point(33, 5),
      new Phaser.Geom.Point(26, 11),
      new Phaser.Geom.Point(20, 12),
      new Phaser.Geom.Point(26, 21),
      new Phaser.Geom.Point(33, 27),
      new Phaser.Geom.Point(16, 27)
    ];

    g.fillStyle(0xf4da52, 1);
    g.fillPoints(points, true);

    g.lineStyle(2, 0xd39a2c, 0.95);
    g.strokePoints(points, true, true);

    g.fillStyle(0xfff2ad, 0.6);
    g.fillTriangle(10, 14, 17, 8, 25, 8);

    g.fillStyle(0x9a6218, 0.3);
    g.fillTriangle(11, 19, 25, 24, 29, 24);

    g.generateTexture(BOOMERANG_TEXTURE_KEY, 40, 32);
    g.destroy();
  }
}
