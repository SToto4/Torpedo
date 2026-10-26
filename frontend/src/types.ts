/** Coordinate on the 10x10 board */
export interface Coordinate {
  x: number;
  y: number;
}

/** Ship orientation */
export type Orientation = 'horizontal' | 'vertical';

/** A ship on the board */
export interface Ship {
  id: string;
  size: number;
  positions: Coordinate[];
  hits: boolean[];
}

/** Shot result */
export type ShotResult = 'MISS' | 'HIT' | 'SUNK';

/** Board state from the API */
export interface BoardState {
  ships: Ship[] | undefined;
  shots: Record<string, ShotResult>;
}

/** Game phase */
export type GamePhase = 'PREPARE' | 'BATTLE' | 'FINISHED';

/** Winner */
export type Winner = 'player' | 'bot' | null;

/** Full game state returned from the API */
export interface GameState {
  id: string;
  username: string;
  phase: GamePhase;
  winner: Winner;
  playerShotCount: number;
  botShotCount: number;
  bonusShotAvailable: boolean;
  playerBoard: BoardState;
  botBoard: BoardState;
}

/** Result of a single shot */
export interface ShotInfo {
  coordinate: Coordinate;
  result: ShotResult;
  sunkShip?: Coordinate[];
}

/** Response from the shoot endpoint */
export interface ShootResponse extends GameState {
  playerShot: ShotInfo;
  botShots: ShotInfo[];
}

/** Leaderboard entry */
export interface LeaderboardEntry {
  username: string;
  /** Number of shots used to win (matches the backend `shots` field). */
  shots: number;
  date: string;
}

/** Ship definition for the ship selector */
export interface ShipDefinition {
  id: string;
  size: number;
  label: string;
}

/** All ships to place */
export const SHIP_DEFINITIONS: ShipDefinition[] = [
  { id: 'ship_5', size: 5, label: 'Hordozó (5)' },
  { id: 'ship_4', size: 4, label: 'Csatahajó (4)' },
  { id: 'ship_3a', size: 3, label: 'Cirkáló (3)' },
  { id: 'ship_3b', size: 3, label: 'Tengeralattjáró (3)' },
  { id: 'ship_2', size: 2, label: 'Romboló (2)' },
];

/** Board interaction mode */
export type BoardMode = 'view' | 'place' | 'shoot';

/** Navigation views */
export type AppView = 'login' | 'menu' | 'leaderboard' | 'game';
