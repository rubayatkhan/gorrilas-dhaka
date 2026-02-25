import Phaser from 'phaser';
import { WIND_MAX, WIND_MIN } from '../constants';

export class WindSystem {
  private wind = 0;

  public rollNewWind(): number {
    const next = Phaser.Math.FloatBetween(WIND_MIN, WIND_MAX);
    this.wind = Math.round(next * 10) / 10;
    return this.wind;
  }

  public getWind(): number {
    return this.wind;
  }
}
