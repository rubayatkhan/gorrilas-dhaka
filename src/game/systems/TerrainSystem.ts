import Phaser from 'phaser';
import { ART_USAGE, ASSET_KEYS } from '../assets';
import {
  EXPLOSION_RADIUS,
  GAME_WIDTH,
  MAX_BUILDING_HEIGHT,
  MIN_BUILDING_HEIGHT,
  STREET_Y
} from '../constants';
import type { BuildingData } from '../types';

const BUILDING_PALETTE = [0x2c3553, 0x384264, 0x3e4b70, 0x4a567f, 0x55618d, 0x3a4463, 0x46537a];
const MIN_COLUMN_HEIGHT = 22;

export class TerrainSystem {
  private readonly scene: Phaser.Scene;
  private readonly layer: Phaser.GameObjects.Layer;
  private buildings: BuildingData[] = [];
  private readonly hasBuildingTexture: boolean;

  public constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.layer = scene.add.layer();
    this.layer.setDepth(2);
    this.hasBuildingTexture = ART_USAGE.buildingSkins && scene.textures.exists(ASSET_KEYS.BUILDINGS);
  }

  public generate(): void {
    this.layer.removeAll(true);
    this.buildings = [];

    let x = 0;
    let id = 0;

    while (x < GAME_WIDTH) {
      const segmentWidth = Math.min(Phaser.Math.Between(62, 108), GAME_WIDTH - x);
      const width = Math.max(40, segmentWidth - 2);
      const initialHeight = Phaser.Math.Between(MIN_BUILDING_HEIGHT + 80, MAX_BUILDING_HEIGHT);
      const baseY = STREET_Y;
      const baseTopY = baseY - initialHeight;
      const centerX = x + width / 2;
      const centerY = baseTopY + initialHeight / 2;
      const baseColor = Phaser.Utils.Array.GetRandom(BUILDING_PALETTE);

      const body = this.scene.add.rectangle(centerX, centerY, width, initialHeight, baseColor, 0);
      body.setOrigin(0.5);
      this.layer.add(body);

      let skin: Phaser.GameObjects.Image | undefined;
      if (this.hasBuildingTexture) {
        skin = this.scene.add.image(centerX, centerY, ASSET_KEYS.BUILDINGS);
        const cropWidth = Phaser.Math.Between(240, 480);
        const cropHeight = Phaser.Math.Between(220, 520);
        const cropX = Phaser.Math.Between(0, 1024 - cropWidth);
        const cropY = Phaser.Math.Between(0, 1024 - cropHeight);
        skin.setCrop(cropX, cropY, cropWidth, cropHeight);
        skin.setDisplaySize(width, initialHeight);
        skin.setAlpha(0.12);
        this.layer.add(skin);
      }

      const shell = this.scene.add.graphics();
      const detail = this.scene.add.graphics();
      this.layer.add(shell);
      this.layer.add(detail);

      const columnCount = Phaser.Math.Clamp(Math.floor(width / 9), 6, 12);
      const columnWidth = width / columnCount;
      const columnTopWorldY: number[] = [];
      for (let i = 0; i < columnCount; i += 1) {
        columnTopWorldY.push(baseTopY + Phaser.Math.Between(-2, 2));
      }

      const building: BuildingData = {
        id,
        x,
        width,
        initialHeight,
        height: initialHeight,
        topY: baseTopY,
        baseY,
        health: 100,
        maxHealth: 100,
        baseColor,
        floorHeight: Phaser.Math.Between(20, 30),
        windowChance: Phaser.Math.FloatBetween(0.18, 0.44),
        columnTopWorldY,
        columnWidth,
        body,
        detail,
        shell,
        skin
      };

      this.updateBuildingVisuals(building, 1);
      this.buildings.push(building);

      id += 1;
      x += segmentWidth;
    }
  }

  public getSpawnPoints(): [{ x: number; y: number }, { x: number; y: number }] {
    if (this.buildings.length === 0) {
      return [
        { x: GAME_WIDTH * 0.2, y: STREET_Y - MIN_BUILDING_HEIGHT },
        { x: GAME_WIDTH * 0.8, y: STREET_Y - MIN_BUILDING_HEIGHT }
      ];
    }

    const leftBoundary = GAME_WIDTH * 0.3;
    const rightBoundary = GAME_WIDTH * 0.7;

    const leftCandidates = this.buildings
      .filter((building) => building.x + building.width / 2 <= leftBoundary)
      .sort((a, b) => this.getCurrentHeight(b) - this.getCurrentHeight(a));

    const rightCandidates = this.buildings
      .filter((building) => building.x + building.width / 2 >= rightBoundary)
      .sort((a, b) => this.getCurrentHeight(b) - this.getCurrentHeight(a));

    const fallbackLeft = this.buildings[1] ?? this.buildings[0];
    const fallbackRight = this.buildings[this.buildings.length - 2] ?? this.buildings[this.buildings.length - 1];

    const left = leftCandidates[0] ?? fallbackLeft;
    const right = rightCandidates[0] ?? fallbackRight;

    if (!left || !right) {
      return [
        { x: GAME_WIDTH * 0.2, y: STREET_Y - MIN_BUILDING_HEIGHT },
        { x: GAME_WIDTH * 0.8, y: STREET_Y - MIN_BUILDING_HEIGHT }
      ];
    }

    return [
      { x: left.x + left.width * 0.5, y: left.topY },
      { x: right.x + right.width * 0.5, y: right.topY }
    ];
  }

  public collidesWithCircle(x: number, y: number, radius: number): boolean {
    const radiusSq = radius * radius;

    for (const building of this.buildings) {
      if (x + radius < building.x || x - radius > building.x + building.width || y - radius > building.baseY) {
        continue;
      }

      const columnCount = building.columnTopWorldY.length;
      if (columnCount === 0) {
        continue;
      }

      const startIndex = Phaser.Math.Clamp(Math.floor((x - radius - building.x) / building.columnWidth), 0, columnCount - 1);
      const endIndex = Phaser.Math.Clamp(Math.floor((x + radius - building.x) / building.columnWidth), 0, columnCount - 1);

      for (let i = startIndex; i <= endIndex; i += 1) {
        const colTop = building.columnTopWorldY[i];
        if (colTop === undefined) {
          continue;
        }

        const colLeft = building.x + i * building.columnWidth;
        const colRight = colLeft + building.columnWidth;

        const nearestX = Phaser.Math.Clamp(x, colLeft, colRight);
        const nearestY = Phaser.Math.Clamp(y, colTop, building.baseY);

        const dx = x - nearestX;
        const dy = y - nearestY;

        if (dx * dx + dy * dy <= radiusSq) {
          return true;
        }
      }
    }

    return false;
  }

  public applyExplosion(x: number, y: number, radius = EXPLOSION_RADIUS): void {
    for (const building of this.buildings) {
      if (x + radius < building.x || x - radius > building.x + building.width || y - radius > building.baseY) {
        continue;
      }

      let changed = false;
      const cols = building.columnTopWorldY;

      for (let i = 0; i < cols.length; i += 1) {
        const currentTop = cols[i];
        if (currentTop === undefined) {
          continue;
        }

        const colCenterX = building.x + (i + 0.5) * building.columnWidth;
        const dx = Math.abs(colCenterX - x);
        if (dx > radius) {
          continue;
        }

        const verticalReach = Math.sqrt(radius * radius - dx * dx);
        const carveBottomY = y + verticalReach;

        const nextTop = Phaser.Math.Clamp(
          Math.max(currentTop, carveBottomY),
          building.topY,
          building.baseY - MIN_COLUMN_HEIGHT
        );

        if (nextTop > currentTop) {
          cols[i] = nextTop;
          changed = true;
        }
      }

      if (!changed) {
        continue;
      }

      this.relaxColumnEdges(cols, building.baseY);

      let minTop = building.baseY - MIN_COLUMN_HEIGHT;
      let totalSolidHeight = 0;

      for (let i = 0; i < cols.length; i += 1) {
        const top = cols[i] ?? building.baseY - MIN_COLUMN_HEIGHT;
        if (top < minTop) {
          minTop = top;
        }
        totalSolidHeight += Math.max(0, building.baseY - top);
      }

      const fullArea = cols.length * building.initialHeight;
      const healthRatio = Phaser.Math.Clamp(totalSolidHeight / fullArea, 0.12, 1);

      building.health = Math.round(healthRatio * 100);
      building.topY = minTop;
      building.height = building.baseY - building.topY;

      this.updateBuildingVisuals(building, healthRatio);
    }
  }

  private updateBuildingVisuals(building: BuildingData, healthRatio: number): void {
    building.body.setPosition(building.x + building.width / 2, building.baseY - building.height / 2);
    building.body.setSize(building.width, building.height);
    building.body.setDisplaySize(building.width, building.height);

    if (building.skin) {
      building.skin.setPosition(building.x + building.width / 2, building.baseY - building.height / 2);
      building.skin.setDisplaySize(building.width, building.height);
      building.skin.setAlpha(0.05 + healthRatio * 0.08);
    }

    this.redrawBuildingShell(building, healthRatio);
    this.redrawBuildingDetails(building, healthRatio);
  }

  private redrawBuildingShell(building: BuildingData, healthRatio: number): void {
    const shell = building.shell;
    if (!shell) {
      return;
    }

    shell.clear();

    const tint = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(0x1b2437),
      Phaser.Display.Color.ValueToColor(building.baseColor),
      100,
      Math.floor(healthRatio * 100)
    );

    const fillColor = Phaser.Display.Color.GetColor(tint.r, tint.g, tint.b);

    const points: Phaser.Geom.Point[] = [];
    points.push(new Phaser.Geom.Point(building.x, building.baseY));

    for (let i = 0; i < building.columnTopWorldY.length; i += 1) {
      const top = building.columnTopWorldY[i] ?? building.baseY - MIN_COLUMN_HEIGHT;
      const xLeft = building.x + i * building.columnWidth;
      const xRight = xLeft + building.columnWidth;

      points.push(new Phaser.Geom.Point(xLeft, top));
      points.push(new Phaser.Geom.Point(xRight, top));
    }

    points.push(new Phaser.Geom.Point(building.x + building.width, building.baseY));

    shell.fillStyle(fillColor, 0.28 + healthRatio * 0.2);
    shell.fillPoints(points, true);

    shell.lineStyle(1, 0xb8cbf3, 0.16 + healthRatio * 0.12);
    shell.strokePoints(points, true, true);
  }

  private redrawBuildingDetails(building: BuildingData, healthRatio: number): void {
    const detail = building.detail;
    if (!detail) {
      return;
    }

    detail.clear();

    for (let i = 0; i < building.columnTopWorldY.length; i += 1) {
      const colTop = building.columnTopWorldY[i] ?? building.baseY - MIN_COLUMN_HEIGHT;
      const colLeft = building.x + i * building.columnWidth;
      const colRight = colLeft + building.columnWidth;
      const inset = Math.max(0.8, building.columnWidth * 0.12);

      const x1 = colLeft + inset;
      const x2 = colRight - inset;
      const colWidth = x2 - x1;
      const colBottom = building.baseY - 2;

      if (colWidth < 2 || colBottom - colTop < 7) {
        continue;
      }

      detail.fillStyle(0xffffff, 0.025 + healthRatio * 0.04);
      detail.fillRect(x1, colTop + 2, Math.max(1, colWidth * 0.22), colBottom - colTop - 3);

      detail.fillStyle(0x000000, 0.05 + (1 - healthRatio) * 0.06);
      detail.fillRect(x2 - Math.max(1, colWidth * 0.22), colTop + 2, Math.max(1, colWidth * 0.22), colBottom - colTop - 3);

      let row = 0;
      for (let y = colBottom - building.floorHeight + 2; y > colTop + 4; y -= building.floorHeight) {
        detail.lineStyle(1, 0xc6d8ff, 0.06 + healthRatio * 0.04);
        detail.lineBetween(x1, y + 1, x2, y + 1);

        const seed = (building.id * 4999 + i * 179 + row * 97 + Math.floor(building.width) * 11) >>> 0;
        const litThreshold = building.windowChance * healthRatio + 0.06;
        const lit = ((seed % 100) / 100) < litThreshold;

        const windowWidth = Math.max(2, colWidth * 0.54);
        const windowHeight = Math.max(3, building.floorHeight * 0.34);
        const wx = x1 + (colWidth - windowWidth) / 2;
        const wy = y + 3;

        if (lit) {
          const warm = (seed & 1) === 0;
          detail.fillStyle(warm ? 0xf8c885 : 0xc2deff, warm ? 0.32 : 0.26);
          detail.fillRoundedRect(wx, wy, windowWidth, windowHeight, 1);
        } else {
          detail.fillStyle(0x8ea8d4, 0.12 + healthRatio * 0.08);
          detail.fillRoundedRect(wx, wy, windowWidth, windowHeight, 1);
        }

        row += 1;
      }
    }
  }

  private relaxColumnEdges(cols: number[], baseY: number): void {
    if (cols.length < 3) {
      return;
    }

    const next = cols.slice();

    for (let i = 1; i < cols.length - 1; i += 1) {
      const prev = cols[i - 1] ?? cols[i] ?? baseY - MIN_COLUMN_HEIGHT;
      const curr = cols[i] ?? cols[i - 1] ?? cols[i + 1] ?? baseY - MIN_COLUMN_HEIGHT;
      const nextVal = cols[i + 1] ?? curr;
      const smoothed = (prev + curr * 2 + nextVal) / 4;

      if (smoothed > curr) {
        next[i] = Math.min(baseY - MIN_COLUMN_HEIGHT, smoothed);
      }
    }

    for (let i = 0; i < cols.length; i += 1) {
      cols[i] = next[i] ?? cols[i] ?? baseY - MIN_COLUMN_HEIGHT;
    }
  }

  private getCurrentHeight(building: BuildingData): number {
    return building.baseY - building.topY;
  }
}
