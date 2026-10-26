import { Board, Coordinate, Orientation, RngFunction, ShotResult } from './types';
import { BOARD_SIZE, SHIP_SIZES, SHIP_IDS, createEmptyBoard, validateShipPlacement, placeShip, processShot } from './gameLogic';

/** Create a seeded random number generator (linear congruential) */
export function createSeededRng(seed: number): RngFunction {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) & 0xFFFFFFFF;
    return (state >>> 0) / 0x100000000;
  };
}

/** Generate random bot board with all ships placed */
export function generateBotBoard(rng: RngFunction): Board {
  let board = createEmptyBoard();

  for (let i = 0; i < SHIP_SIZES.length; i++) {
    const size = SHIP_SIZES[i];
    const id = SHIP_IDS[i];
    let placed = false;

    while (!placed) {
      const orientation: Orientation = rng() < 0.5 ? 'horizontal' : 'vertical';
      const maxX = orientation === 'horizontal' ? BOARD_SIZE - size : BOARD_SIZE - 1;
      const maxY = orientation === 'vertical' ? BOARD_SIZE - size : BOARD_SIZE - 1;
      const x = Math.floor(rng() * (maxX + 1));
      const y = Math.floor(rng() * (maxY + 1));

      const validation = validateShipPlacement(board, size, { x, y }, orientation);
      if (validation.valid) {
        board = placeShip(board, id, size, { x, y }, orientation);
        placed = true;
      }
    }
  }

  return board;
}

/** Bot chooses a target coordinate from un-shot cells */
export function botChooseTarget(board: Board, rng: RngFunction): Coordinate {
  const available: Coordinate[] = [];
  for (let x = 0; x < BOARD_SIZE; x++) {
    for (let y = 0; y < BOARD_SIZE; y++) {
      const key = `${x},${y}`;
      if (!board.shots.has(key)) {
        available.push({ x, y });
      }
    }
  }

  if (available.length === 0) {
    throw new Error('No available cells to shoot');
  }

  const index = Math.floor(rng() * available.length);
  return available[index];
}

function allShipsSunkCheck(board: Board): boolean {
  let hits = 0;
  for (const ship of board.ships) {
    hits += ship.hits.filter(h => h).length;
  }
  return hits >= 17;
}

/** Execute bot turn: bot gets one shot, and if it hits, one bonus shot. Returns the shot results. */
export function executeBotTurn(playerBoard: Board, rng: RngFunction): ShotResult[] {
  const results: ShotResult[] = [];

  // First shot
  const target1 = botChooseTarget(playerBoard, rng);
  const result1 = processShot(playerBoard, target1);
  results.push(result1);

  // If first shot is a hit/sunk AND not all ships sunk, bot gets bonus shot
  if ((result1.result === 'HIT' || result1.result === 'SUNK') && !allShipsSunkCheck(playerBoard)) {
    const target2 = botChooseTarget(playerBoard, rng);
    const result2 = processShot(playerBoard, target2);
    results.push(result2);
  }

  return results;
}
