import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../constants';
import type { MatchSetup } from '../types';

const DEFAULT_NAMES: [string, string] = ['Player 1', 'Player 2'];
const DEFAULT_TARGET_SCORE = 3;
const MAX_NAME_LENGTH = 14;
const MAX_TARGET_SCORE = 15;
const MIN_TARGET_SCORE = 1;
const MATCH_SETUP_REGISTRY_KEY = 'matchSetup';

const PROMPTS = [
  "Name of Player 1 (Default = 'Player 1'): ",
  "Name of Player 2 (Default = 'Player 2'): ",
  'Play to how many total points (Default = 3)? '
] as const;

export class SetupScene extends Phaser.Scene {
  private promptText: Phaser.GameObjects.Text[] = [];
  private helperText!: Phaser.GameObjects.Text;
  private titleText!: Phaser.GameObjects.Text;
  private cursorVisible = true;
  private currentField = 0;
  private readonly values: [string, string, string] = ['', '', ''];
  private readonly domKeyHandler = (event: KeyboardEvent): void => {
    this.onKeyDown(event);
  };

  public constructor() {
    super(SCENE_KEYS.SETUP);
  }

  public create(): void {
    this.add.rectangle(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.5, GAME_WIDTH, GAME_HEIGHT, 0x000000, 1).setDepth(0);

    this.titleText = this.add
      .text(GAME_WIDTH * 0.5, 84, 'DHAKA GORRILAS: MATCH SETUP', {
        fontFamily: 'Courier New',
        fontSize: '34px',
        color: '#cfd4dc'
      })
      .setOrigin(0.5, 0)
      .setDepth(1);

    this.add
      .text(GAME_WIDTH * 0.5, 128, 'Type values, press ENTER to confirm each line.', {
        fontFamily: 'Courier New',
        fontSize: '18px',
        color: '#8e95a2'
      })
      .setOrigin(0.5, 0)
      .setDepth(1);

    const startY = 220;
    for (let i = 0; i < PROMPTS.length; i += 1) {
      const y = startY + i * 94;
      this.promptText.push(
        this.add
          .text(120, y, '', {
            fontFamily: 'Courier New',
            fontSize: '50px',
            color: '#aeb3bc'
          })
          .setOrigin(0, 0)
          .setDepth(1)
          .setScale(0.36)
      );
    }

    this.helperText = this.add
      .text(120, GAME_HEIGHT - 70, 'ENTER: confirm  |  BACKSPACE: edit', {
        fontFamily: 'Courier New',
        fontSize: '20px',
        color: '#7d8798'
      })
      .setDepth(1);

    for (let i = 0; i < 60; i += 1) {
      this.add
        .rectangle(GAME_WIDTH * 0.5, (i / 60) * GAME_HEIGHT, GAME_WIDTH, 1, 0xffffff, 0.018)
        .setDepth(0.5)
        .setBlendMode(Phaser.BlendModes.ADD);
    }

    window.addEventListener('keydown', this.domKeyHandler);

    this.time.addEvent({
      delay: 350,
      loop: true,
      callback: () => {
        this.cursorVisible = !this.cursorVisible;
        this.renderPrompts();
      }
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('keydown', this.domKeyHandler);
    });

    this.renderPrompts();
  }

  private onKeyDown(event: KeyboardEvent): void {
    const handledKeys = new Set([
      'Enter',
      'Backspace',
      'Delete',
      'Tab',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      ' '
    ]);

    if (event.key.length === 1 || handledKeys.has(event.key)) {
      event.preventDefault();
    }

    if (this.currentField >= PROMPTS.length) {
      return;
    }

    if (event.key === 'Enter') {
      this.commitCurrentField();
      return;
    }

    if (event.key === 'Backspace') {
      const currentValue = this.values[this.currentField] ?? '';
      this.values[this.currentField] = currentValue.slice(0, -1);
      this.renderPrompts();
      return;
    }

    if (event.key.length !== 1) {
      return;
    }

    if (this.currentField < 2) {
      if (!/^[a-z0-9 .,'-]$/i.test(event.key)) {
        return;
      }
      const currentValue = this.values[this.currentField] ?? '';
      if (currentValue.length >= MAX_NAME_LENGTH) {
        return;
      }
      this.values[this.currentField] = `${currentValue}${event.key}`;
      this.renderPrompts();
      return;
    }

    if (!/^[0-9]$/.test(event.key)) {
      return;
    }
    const currentValue = this.values[this.currentField] ?? '';
    if (currentValue.length >= 2) {
      return;
    }
    this.values[this.currentField] = `${currentValue}${event.key}`;
    this.renderPrompts();
  }

  private commitCurrentField(): void {
    if (this.currentField === 2) {
      this.values[2] = String(this.parseTargetScore());
      this.currentField += 1;
      this.renderPrompts();
      this.finishSetup();
      return;
    }

    const currentValue = this.values[this.currentField] ?? '';
    this.values[this.currentField] = currentValue.trim();
    this.currentField += 1;
    this.renderPrompts();
  }

  private renderPrompts(): void {
    for (let i = 0; i < PROMPTS.length; i += 1) {
      const text = this.promptText[i];
      const prompt = PROMPTS[i];
      if (!text) {
        continue;
      }
      if (!prompt) {
        continue;
      }

      const committed = i < this.currentField;
      const active = i === this.currentField;
      let value = '';

      if (committed) {
        if (i === 0 || i === 1) {
          value = (this.values[i] ?? '').trim() || DEFAULT_NAMES[i];
        } else {
          value = String(this.parseTargetScore());
        }
      } else if (active) {
        value = this.values[i] ?? '';
        if (this.cursorVisible) {
          value += '_';
        }
      }

      text.setText(`${prompt}${value}`);
      text.setColor(active ? '#f5f6fa' : '#aeb3bc');
    }
  }

  private finishSetup(): void {
    const setup: MatchSetup = {
      playerNames: [this.values[0].trim() || DEFAULT_NAMES[0], this.values[1].trim() || DEFAULT_NAMES[1]],
      targetScore: this.parseTargetScore()
    };

    this.registry.set(MATCH_SETUP_REGISTRY_KEY, setup);
    this.scene.stop(SCENE_KEYS.UI);
    this.scene.start(SCENE_KEYS.GAME, { setup });
    this.scene.launch(SCENE_KEYS.UI, { setup });
  }

  private parseTargetScore(): number {
    const parsed = Number.parseInt(this.values[2], 10);
    if (!Number.isFinite(parsed)) {
      return DEFAULT_TARGET_SCORE;
    }

    return Phaser.Math.Clamp(parsed, MIN_TARGET_SCORE, MAX_TARGET_SCORE);
  }
}
