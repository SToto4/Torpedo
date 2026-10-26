import { GameState } from './types';

class GameStore {
  private games: Map<string, GameState> = new Map();

  get(id: string): GameState | undefined {
    return this.games.get(id);
  }

  set(id: string, game: GameState): void {
    this.games.set(id, game);
  }

  delete(id: string): void {
    this.games.delete(id);
  }

  getByUsername(username: string): GameState | undefined {
    for (const game of this.games.values()) {
      if (game.username === username && game.phase !== 'FINISHED') {
        return game;
      }
    }
    return undefined;
  }
}

export const gameStore = new GameStore();
