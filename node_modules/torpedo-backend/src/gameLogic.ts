import { Coordinate, Ship, Board, ShotResult, GameState, Phase, Orientation, RngFunction } from './types';

export const BOARD_SIZE = 10;
export const SHIP_SIZES = [5, 4, 3, 3, 2];
export const SHIP_IDS = ['ship_5', 'ship_4', 'ship_3a', 'ship_3b', 'ship_2'];
export const TOTAL_SHIP_CELLS = 17; // 5+4+3+3+2

function coordKey(c: Coordinate): string {
  return `${c.x},${c.y}`;
}

/** Validate that a ship placement is legal on the board */
export function validateShipPlacement(
  board: Board,
  size: number,
  start: Coordinate,
  orientation: Orientation
): { valid: boolean; positions: Coordinate[]; error?: string } {
  const positions: Coordinate[] = [];

  for (let i = 0; i < size; i++) {
    const x = orientation === 'horizontal' ? start.x + i : start.x;
    const y = orientation === 'vertical' ? start.y + i : start.y;

    // Check bounds (0-9)
    if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) {
      return { valid: false, positions: [], error: `Ship extends outside the board at (${x}, ${y})` };
    }
    positions.push({ x, y });
  }

  // Check overlap with existing ships
  const occupiedCells = new Set<string>();
  for (const ship of board.ships) {
    for (const pos of ship.positions) {
      occupiedCells.add(coordKey(pos));
    }
  }

  for (const pos of positions) {
    if (occupiedCells.has(coordKey(pos))) {
      return { valid: false, positions: [], error: `Cell (${pos.x}, ${pos.y}) is already occupied` };
    }
  }

  return { valid: true, positions };
}

/** Place a ship on the board. Returns updated board or throws. */
export function placeShip(
  board: Board,
  shipId: string,
  size: number,
  start: Coordinate,
  orientation: Orientation
): Board {
  // Check if this ship was already placed
  if (board.ships.some(s => s.id === shipId)) {
    throw new Error(`Ship ${shipId} is already placed`);
  }

  const validation = validateShipPlacement(board, size, start, orientation);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const ship: Ship = {
    id: shipId,
    size,
    positions: validation.positions,
    hits: new Array(size).fill(false),
  };

  return {
    ...board,
    ships: [...board.ships, ship],
  };
}

/** Create an empty board */
export function createEmptyBoard(): Board {
  return {
    ships: [],
    shots: new Map(),
  };
}

/** Check if all ships have been placed */
export function allShipsPlaced(board: Board): boolean {
  return board.ships.length === SHIP_SIZES.length;
}

/** Process a shot against a board. Returns the result and mutates the board's shots map. */
export function processShot(board: Board, coord: Coordinate): ShotResult {
  const key = coordKey(coord);

  // Validate coordinate bounds
  if (coord.x < 0 || coord.x >= BOARD_SIZE || coord.y < 0 || coord.y >= BOARD_SIZE) {
    throw new Error(`Coordinate (${coord.x}, ${coord.y}) is out of bounds`);
  }

  // Check if already shot
  if (board.shots.has(key)) {
    throw new Error(`Cell (${coord.x}, ${coord.y}) has already been targeted`);
  }

  // Check each ship
  for (const ship of board.ships) {
    const posIndex = ship.positions.findIndex(p => p.x === coord.x && p.y === coord.y);
    if (posIndex !== -1) {
      ship.hits[posIndex] = true;
      const isSunk = ship.hits.every(h => h);

      if (isSunk) {
        // Mark all positions of the sunk ship as SUNK in shots
        for (const pos of ship.positions) {
          board.shots.set(coordKey(pos), 'SUNK');
        }
        return { coordinate: coord, result: 'SUNK', sunkShip: [...ship.positions] };
      } else {
        board.shots.set(key, 'HIT');
        return { coordinate: coord, result: 'HIT' };
      }
    }
  }

  // Miss
  board.shots.set(key, 'MISS');
  return { coordinate: coord, result: 'MISS' };
}

/** Count total hits on a board (HIT + SUNK cells that correspond to ship positions) */
export function countHits(board: Board): number {
  let hits = 0;
  for (const ship of board.ships) {
    hits += ship.hits.filter(h => h).length;
  }
  return hits;
}

/** Check if all ships on a board are sunk */
export function allShipsSunk(board: Board): boolean {
  return countHits(board) >= TOTAL_SHIP_CELLS;
}

/** Validate that game is in the expected phase */
export function assertPhase(game: GameState, expected: Phase): void {
  if (game.phase !== expected) {
    throw new Error(`Invalid operation: game is in ${game.phase} phase, expected ${expected}`);
  }
}
