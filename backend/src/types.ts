export type CellState = 'EMPTY' | 'SHIP' | 'MISS' | 'HIT' | 'SUNK';
export type Phase = 'PREPARE' | 'BATTLE' | 'FINISHED';
export type Orientation = 'horizontal' | 'vertical';
export type Winner = 'player' | 'bot' | null;

export interface Coordinate {
  x: number;
  y: number;
}

export interface Ship {
  id: string;          // e.g., "ship_5", "ship_4", "ship_3a", "ship_3b", "ship_2"
  size: number;
  positions: Coordinate[];
  hits: boolean[];     // tracks which positions have been hit
}

export interface Board {
  ships: Ship[];
  shots: Map<string, 'MISS' | 'HIT' | 'SUNK'>; // key: "x,y"
}

export interface ShotResult {
  coordinate: Coordinate;
  result: 'MISS' | 'HIT' | 'SUNK';
  sunkShip?: Coordinate[];  // positions of the sunk ship (if SUNK)
}

export interface GameState {
  id: string;
  username: string;
  phase: Phase;
  playerBoard: Board;
  botBoard: Board;
  playerShotCount: number;
  botShotCount: number;
  winner: Winner;
  bonusShotAvailable: boolean;
  /**
   * Injectable RNG used for bot board generation and bot targeting.
   * Defaults to Math.random, but can be replaced with a seeded RNG
   * (see createSeededRng) so that gameplay is 100% deterministic in tests.
   */
  rng: RngFunction;
}

export interface LeaderboardEntry {
  username: string;
  shots: number;
  date: string;
}

export type RngFunction = () => number; // returns 0..1 like Math.random
