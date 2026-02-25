import Phaser from 'phaser';
import { ART_USAGE, ASSET_KEYS } from '../assets';
import { gameEventBus, GAME_EVENT_HUD_UPDATE } from '../core/events';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../constants';
export class UIScene extends Phaser.Scene {
    roundText;
    detailText;
    statusText;
    scoreText;
    playerOnePanel;
    playerTwoPanel;
    playerOneTitle;
    playerTwoTitle;
    windMeter;
    constructor() {
        super(SCENE_KEYS.UI);
    }
    create() {
        if (ART_USAGE.hudPanel && this.textures.exists(ASSET_KEYS.HUD_PANEL)) {
            this.add.image(GAME_WIDTH * 0.5, 56, ASSET_KEYS.HUD_PANEL).setDisplaySize(GAME_WIDTH - 20, 104).setDepth(98).setAlpha(0.45);
        }
        this.playerOnePanel = this.add.rectangle(12, 12, 318, 102, 0x0a1428, 0.58).setOrigin(0, 0).setDepth(100);
        this.playerOnePanel.setStrokeStyle(1, 0x8ea8d8, 0.6);
        this.playerTwoPanel = this.add.rectangle(GAME_WIDTH - 12, 12, 318, 102, 0x0a1428, 0.58).setOrigin(1, 0).setDepth(100);
        this.playerTwoPanel.setStrokeStyle(1, 0x8ea8d8, 0.6);
        const centerPanel = this.add.rectangle(GAME_WIDTH * 0.5, 12, 430, 102, 0x081122, 0.54).setOrigin(0.5, 0).setDepth(100);
        centerPanel.setStrokeStyle(1, 0x7f97c9, 0.45);
        const scorePanel = this.add.rectangle(GAME_WIDTH * 0.5, GAME_HEIGHT - 66, 390, 62, 0x060b17, 0.68).setOrigin(0.5, 0).setDepth(100);
        scorePanel.setStrokeStyle(1, 0x9cb3e3, 0.65);
        this.playerOneTitle = this.add
            .text(24, 22, 'PLAYER 1', {
            fontFamily: 'Trebuchet MS',
            fontSize: '20px',
            color: '#f0f6ff',
            stroke: '#050811',
            strokeThickness: 3
        })
            .setDepth(101);
        this.add
            .text(24, 46, 'Arrow keys: angle + power\nSPACE throw | R reset round', {
            fontFamily: 'Trebuchet MS',
            fontSize: '14px',
            color: '#c4d9ff',
            lineSpacing: 3,
            stroke: '#050811',
            strokeThickness: 2
        })
            .setDepth(101);
        this.playerTwoTitle = this.add
            .text(GAME_WIDTH - 24, 22, 'PLAYER 2', {
            fontFamily: 'Trebuchet MS',
            fontSize: '20px',
            color: '#f0f6ff',
            align: 'right',
            stroke: '#050811',
            strokeThickness: 3
        })
            .setOrigin(1, 0)
            .setDepth(101);
        this.add
            .text(GAME_WIDTH - 24, 46, 'Arrow keys: angle + power\nSPACE throw | M reset match', {
            fontFamily: 'Trebuchet MS',
            fontSize: '14px',
            color: '#c4d9ff',
            align: 'right',
            lineSpacing: 3,
            stroke: '#050811',
            strokeThickness: 2
        })
            .setOrigin(1, 0)
            .setDepth(101);
        this.roundText = this.add
            .text(GAME_WIDTH * 0.5, 22, 'Loading round...', {
            fontFamily: 'Trebuchet MS',
            fontSize: '26px',
            color: '#f6fbff',
            stroke: '#050811',
            strokeThickness: 4
        })
            .setOrigin(0.5, 0)
            .setDepth(101);
        this.detailText = this.add
            .text(GAME_WIDTH * 0.5, 56, '', {
            fontFamily: 'Trebuchet MS',
            fontSize: '18px',
            color: '#d7e5ff',
            stroke: '#050811',
            strokeThickness: 3
        })
            .setOrigin(0.5, 0)
            .setDepth(101);
        this.statusText = this.add
            .text(GAME_WIDTH * 0.5, 82, '', {
            fontFamily: 'Trebuchet MS',
            fontSize: '14px',
            color: '#ffe3b0',
            stroke: '#050811',
            strokeThickness: 2
        })
            .setOrigin(0.5, 0)
            .setDepth(101);
        this.scoreText = this.add
            .text(GAME_WIDTH * 0.5, GAME_HEIGHT - 57, 'P1 0 : 0 P2', {
            fontFamily: 'Trebuchet MS',
            fontSize: '34px',
            color: '#fdf5e1',
            stroke: '#050811',
            strokeThickness: 5
        })
            .setOrigin(0.5, 0)
            .setDepth(101);
        this.windMeter = this.add.graphics().setDepth(101);
        gameEventBus.on(GAME_EVENT_HUD_UPDATE, this.onHudUpdate, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            gameEventBus.off(GAME_EVENT_HUD_UPDATE, this.onHudUpdate, this);
        });
    }
    onHudUpdate(hud) {
        this.roundText.setText(`Round ${hud.round}  |  Player ${hud.currentPlayer + 1} turn`);
        const windDirection = hud.wind >= 0 ? '->' : '<-';
        this.detailText.setText(`Angle ${hud.angle.toFixed(1)} deg  |  Power ${hud.power.toFixed(0)}  |  Wind ${windDirection} ${Math.abs(hud.wind).toFixed(1)}`);
        this.statusText.setText(hud.status);
        this.scoreText.setText(`P1 ${hud.scores[0]}  :  ${hud.scores[1]} P2`);
        this.updateTurnHighlight(hud.currentPlayer);
        this.redrawWindMeter(hud.wind);
    }
    updateTurnHighlight(currentPlayer) {
        const playerOneActive = currentPlayer === 0;
        this.playerOnePanel.setFillStyle(playerOneActive ? 0x2f1f12 : 0x0a1428, playerOneActive ? 0.72 : 0.58);
        this.playerOnePanel.setStrokeStyle(1, playerOneActive ? 0xffd18f : 0x8ea8d8, 0.95);
        this.playerOneTitle.setColor(playerOneActive ? '#ffd59a' : '#f0f6ff');
        this.playerTwoPanel.setFillStyle(playerOneActive ? 0x0a1428 : 0x14253f, playerOneActive ? 0.58 : 0.72);
        this.playerTwoPanel.setStrokeStyle(1, playerOneActive ? 0x8ea8d8 : 0x9fcfff, 0.95);
        this.playerTwoTitle.setColor(playerOneActive ? '#f0f6ff' : '#bbe2ff');
    }
    redrawWindMeter(wind) {
        const meterWidth = 240;
        const meterHeight = 11;
        const x = GAME_WIDTH * 0.5 - meterWidth / 2;
        const y = 100;
        this.windMeter.clear();
        this.windMeter.fillStyle(0x1f2b47, 0.9);
        this.windMeter.fillRoundedRect(x, y, meterWidth, meterHeight, 4);
        this.windMeter.lineStyle(1, 0x9db9ea, 0.55);
        this.windMeter.strokeRoundedRect(x, y, meterWidth, meterHeight, 4);
        const normalized = Phaser.Math.Clamp(wind / 90, -1, 1);
        const center = x + meterWidth / 2;
        const barLength = normalized * (meterWidth * 0.5 - 3);
        const color = normalized >= 0 ? 0x86d6ff : 0xffbe88;
        this.windMeter.fillStyle(color, 0.95);
        if (barLength >= 0) {
            this.windMeter.fillRect(center, y + 1, barLength, meterHeight - 2);
        }
        else {
            this.windMeter.fillRect(center + barLength, y + 1, -barLength, meterHeight - 2);
        }
        this.windMeter.lineStyle(1, 0xe4f0ff, 0.8);
        this.windMeter.lineBetween(center, y - 2, center, y + meterHeight + 2);
    }
}
