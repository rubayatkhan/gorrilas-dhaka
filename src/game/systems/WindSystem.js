import Phaser from 'phaser';
import { WIND_MAX, WIND_MIN } from '../constants';
export class WindSystem {
    wind = 0;
    rollNewWind() {
        const next = Phaser.Math.FloatBetween(WIND_MIN, WIND_MAX);
        this.wind = Math.round(next * 10) / 10;
        return this.wind;
    }
    getWind() {
        return this.wind;
    }
}
