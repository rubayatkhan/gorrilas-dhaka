export class TurnSystem {
    currentPlayer = 0;
    round = 0;
    scores = [0, 0];
    startRound(startingPlayer) {
        this.round += 1;
        this.currentPlayer = startingPlayer;
    }
    nextTurn() {
        this.currentPlayer = this.currentPlayer === 0 ? 1 : 0;
        return this.currentPlayer;
    }
    addScore(playerIndex) {
        this.scores[playerIndex] += 1;
    }
    resetMatch() {
        this.round = 0;
        this.currentPlayer = 0;
        this.scores[0] = 0;
        this.scores[1] = 0;
    }
    getCurrentPlayer() {
        return this.currentPlayer;
    }
    getRound() {
        return this.round;
    }
    getScores() {
        return [this.scores[0], this.scores[1]];
    }
}
