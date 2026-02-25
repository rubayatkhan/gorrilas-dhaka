import type { PlayerIndex } from '../types';

export class TurnSystem {
  private currentPlayer: PlayerIndex = 0;
  private round = 0;
  private readonly scores: [number, number] = [0, 0];

  public startRound(startingPlayer: PlayerIndex): void {
    this.round += 1;
    this.currentPlayer = startingPlayer;
  }

  public nextTurn(): PlayerIndex {
    this.currentPlayer = this.currentPlayer === 0 ? 1 : 0;
    return this.currentPlayer;
  }

  public addScore(playerIndex: PlayerIndex): void {
    this.scores[playerIndex] += 1;
  }

  public resetMatch(): void {
    this.round = 0;
    this.currentPlayer = 0;
    this.scores[0] = 0;
    this.scores[1] = 0;
  }

  public getCurrentPlayer(): PlayerIndex {
    return this.currentPlayer;
  }

  public getRound(): number {
    return this.round;
  }

  public getScores(): [number, number] {
    return [this.scores[0], this.scores[1]];
  }
}
