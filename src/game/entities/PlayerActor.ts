import Phaser from 'phaser';
import { ART_USAGE, ASSET_KEYS } from '../assets';
import { PLAYER_HIT_RADIUS } from '../constants';
import type { PlayerIndex } from '../types';

const REST_LEFT_ARM_ANGLE = -34;
const REST_RIGHT_ARM_ANGLE = 24;

export interface PlayerStyle {
  bodyColor: number;
  accentColor: number;
  label: string;
}

export class PlayerActor {
  public readonly facing: -1 | 1;
  public readonly index: PlayerIndex;

  private readonly scene: Phaser.Scene;
  private readonly marker: Phaser.GameObjects.Ellipse;
  private readonly actorContainer: Phaser.GameObjects.Container;
  private readonly leftArm: Phaser.GameObjects.Container;
  private readonly rightArm: Phaser.GameObjects.Container;
  private readonly nameTag: Phaser.GameObjects.Text;

  private readonly avatar?: Phaser.GameObjects.Image;

  private throwTweens: Phaser.Tweens.Tween[] = [];
  private rooftopY = 0;
  private x = 0;

  public constructor(scene: Phaser.Scene, index: PlayerIndex, facing: -1 | 1, style: PlayerStyle) {
    this.scene = scene;
    this.index = index;
    this.facing = facing;

    this.marker = this.scene.add.ellipse(0, 0, 34, 11, style.accentColor, 0.34).setDepth(7);

    this.actorContainer = this.scene.add.container(0, 0).setDepth(9);
    this.actorContainer.setScale(facing, 1);

    const legs = this.scene.add.rectangle(0, -13, 22, 17, style.bodyColor, 1);
    const torso = this.scene.add.ellipse(0, -30, 32, 40, style.bodyColor, 1);
    const chest = this.scene.add.ellipse(0, -25, 18, 21, 0xba8f56, 0.82);
    const neck = this.scene.add.rectangle(0, -43, 8, 6, 0x4d3521, 1);

    const head = this.scene.add.circle(0, -53, 15, style.bodyColor, 1);
    const face = this.scene.add.ellipse(0, -50, 17, 13, 0xc9a06b, 1);
    const brow = this.scene.add.rectangle(0, -56, 14, 3, 0x1f130c, 0.85);

    const eyeL = this.scene.add.circle(-4, -50, 2.5, 0xf7fbff, 1);
    const eyeR = this.scene.add.circle(4, -50, 2.5, 0xf7fbff, 1);
    const pupilL = this.scene.add.circle(-3.2, -50, 1.1, 0x0f1119, 1);
    const pupilR = this.scene.add.circle(4.8, -50, 1.1, 0x0f1119, 1);

    const mouth = this.scene.add.ellipse(0, -45.5, 9, 4.2, 0x2d1b12, 0.95);
    const bandana = this.scene.add.rectangle(0, -42, 18, 4, style.accentColor, 0.95);

    this.leftArm = this.createArm(-15, -39, style.bodyColor);
    this.rightArm = this.createArm(15, -39, style.bodyColor);

    this.leftArm.angle = REST_LEFT_ARM_ANGLE;
    this.rightArm.angle = REST_RIGHT_ARM_ANGLE;

    this.actorContainer.add([
      this.leftArm,
      this.rightArm,
      legs,
      torso,
      chest,
      neck,
      head,
      face,
      brow,
      eyeL,
      eyeR,
      pupilL,
      pupilR,
      mouth,
      bandana
    ]);

    if (ART_USAGE.characterSkins) {
      const preferredTextureKey = index === 0 ? ASSET_KEYS.PLAYER_ONE : ASSET_KEYS.PLAYER_TWO;

      if (this.scene.textures.exists(preferredTextureKey)) {
        this.avatar = this.scene.add.image(0, 0, preferredTextureKey).setDepth(9.3).setOrigin(0.5, 1);
        if (index === 0) {
          this.avatar.setCrop(241, 547, 581, 619);
        } else {
          this.avatar.setCrop(312, 508, 565, 628);
        }
        this.avatar.setDisplaySize(84, 106);
        this.actorContainer.setAlpha(0.18);
      }
    }

    this.nameTag = this.scene.add
      .text(0, 0, style.label, {
        fontFamily: 'Trebuchet MS',
        fontSize: '15px',
        color: '#f4f6ff',
        stroke: '#0b1126',
        strokeThickness: 3
      })
      .setOrigin(0.5, 1)
      .setDepth(10);
  }

  public setPosition(x: number, rooftopY: number): void {
    this.x = x;
    this.rooftopY = rooftopY;

    this.marker.setPosition(x, rooftopY - 1);
    this.actorContainer.setPosition(x, rooftopY);
    this.avatar?.setPosition(x, rooftopY + 1);
    this.nameTag.setPosition(x, rooftopY - 63);
  }

  public setActive(isActive: boolean): void {
    this.marker.setFillStyle(isActive ? 0xffde8f : 0xc7d8ff, isActive ? 0.72 : 0.34);
    this.marker.setStrokeStyle(isActive ? 2 : 0, isActive ? 0xffde8f : 0x000000, isActive ? 0.7 : 0);
    this.actorContainer.setScale(this.facing, isActive ? 1.02 : 1);
    this.avatar?.setTint(isActive ? 0xffffff : 0xe9efff);
  }

  public playThrowAnimation(): void {
    for (const tween of this.throwTweens) {
      tween.stop();
    }
    this.throwTweens = [];

    this.leftArm.angle = REST_LEFT_ARM_ANGLE;
    this.rightArm.angle = REST_RIGHT_ARM_ANGLE;

    const windupMs = 110;
    const releaseMs = 110;
    const recoverMs = 150;

    this.throwTweens.push(
      this.scene.tweens.add({
        targets: this.leftArm,
        angle: -74,
        duration: windupMs,
        ease: 'Cubic.Out'
      }),
      this.scene.tweens.add({
        targets: this.rightArm,
        angle: 2,
        duration: windupMs,
        ease: 'Cubic.Out'
      }),
      this.scene.tweens.add({
        targets: this.leftArm,
        angle: -148,
        delay: windupMs,
        duration: releaseMs,
        ease: 'Cubic.In'
      }),
      this.scene.tweens.add({
        targets: this.rightArm,
        angle: 64,
        delay: windupMs,
        duration: releaseMs,
        ease: 'Cubic.In'
      }),
      this.scene.tweens.add({
        targets: this.leftArm,
        angle: REST_LEFT_ARM_ANGLE,
        delay: windupMs + releaseMs,
        duration: recoverMs,
        ease: 'Cubic.Out'
      }),
      this.scene.tweens.add({
        targets: this.rightArm,
        angle: REST_RIGHT_ARM_ANGLE,
        delay: windupMs + releaseMs,
        duration: recoverMs,
        ease: 'Cubic.Out'
      })
    );
  }

  public getLaunchPoint(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.x + this.facing * 24, this.rooftopY - 45);
  }

  public isHit(testX: number, testY: number, radius: number): boolean {
    const targetY = this.rooftopY - 34;
    const dx = testX - this.x;
    const dy = testY - targetY;
    return Math.sqrt(dx * dx + dy * dy) <= PLAYER_HIT_RADIUS + radius;
  }

  public destroy(): void {
    for (const tween of this.throwTweens) {
      tween.stop();
    }
    this.throwTweens = [];
    this.marker.destroy();
    this.actorContainer.destroy(true);
    this.avatar?.destroy();
    this.nameTag.destroy();
  }

  private createArm(x: number, y: number, furColor: number): Phaser.GameObjects.Container {
    const arm = this.scene.add.container(x, y);

    const upperArm = this.scene.add.rectangle(0, 11, 9, 23, furColor, 1).setOrigin(0.5);
    const foreArm = this.scene.add.rectangle(0.5, 20, 8, 16, furColor, 1).setOrigin(0.5);
    const hand = this.scene.add.circle(0, 27, 4.5, 0xc9a06b, 1);

    arm.add([upperArm, foreArm, hand]);
    return arm;
  }
}
