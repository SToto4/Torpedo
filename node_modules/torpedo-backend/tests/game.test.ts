import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/index';
import { gameStore } from '../src/store';
import {
  createEmptyBoard,
  placeShip,
  validateShipPlacement,
  BOARD_SIZE,
  SHIP_SIZES,
  SHIP_IDS,
  TOTAL_SHIP_CELLS,
} from '../src/gameLogic';
import { createSeededRng, generateBotBoard } from '../src/botLogic';
import type { Board, GameState } from '../src/types';

// ──────────────────────────────────────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────────────────────────────────────

/** Standard player ship placements used for integration tests */
const PLAYER_PLACEMENTS = [
  { shipId: 'ship_5', x: 0, y: 0, orientation: 'horizontal' },
  { shipId: 'ship_4', x: 0, y: 1, orientation: 'horizontal' },
  { shipId: 'ship_3a', x: 0, y: 2, orientation: 'horizontal' },
  { shipId: 'ship_3b', x: 0, y: 3, orientation: 'horizontal' },
  { shipId: 'ship_2', x: 0, y: 4, orientation: 'horizontal' },
] as const;

/**
 * Helper: Create a game via the API, place all player ships, start the game,
 * then replace the bot board with a known configuration so that tests are
 * deterministic.
 *
 * Known bot board layout (all horizontal):
 *   ship_5  → y=5  (0,5)…(4,5)
 *   ship_4  → y=6  (0,6)…(3,6)
 *   ship_3a → y=7  (0,7)…(2,7)
 *   ship_3b → y=8  (0,8)…(2,8)
 *   ship_2  → y=9  (0,9)…(1,9)
 */
async function setupBattleGame(username = 'tester') {
  // 1. Create game
  const createRes = await request(app)
    .post('/api/game/new')
    .send({ username });
  const gameId: string = createRes.body.id;

  // 2. Place all player ships
  for (const p of PLAYER_PLACEMENTS) {
    await request(app)
      .post(`/api/game/${gameId}/place`)
      .send(p);
  }

  // 3. Start game → transitions to BATTLE
  await request(app).post(`/api/game/${gameId}/start`).send();

  // 4. Replace bot board with known positions
  const game = gameStore.get(gameId)!;
  let knownBotBoard = createEmptyBoard();
  knownBotBoard = placeShip(knownBotBoard, 'ship_5', 5, { x: 0, y: 5 }, 'horizontal');
  knownBotBoard = placeShip(knownBotBoard, 'ship_4', 4, { x: 0, y: 6 }, 'horizontal');
  knownBotBoard = placeShip(knownBotBoard, 'ship_3a', 3, { x: 0, y: 7 }, 'horizontal');
  knownBotBoard = placeShip(knownBotBoard, 'ship_3b', 3, { x: 0, y: 8 }, 'horizontal');
  knownBotBoard = placeShip(knownBotBoard, 'ship_2', 2, { x: 0, y: 9 }, 'horizontal');
  game.botBoard = knownBotBoard;
  gameStore.set(gameId, game);

  return { gameId, game };
}

// ══════════════════════════════════════════════════════════════════════════════
//  AC1 – Normal ship placement
// ══════════════════════════════════════════════════════════════════════════════

describe('AC1 – Normal ship placement', () => {
  // AC1: Place a size-4 ship at (2,2) horizontal on empty board → should
  //      succeed and occupy (2,2), (3,2), (4,2), (5,2).

  it('should place a size-4 ship at (2,2) horizontal and occupy the correct cells', () => {
    let board = createEmptyBoard();
    board = placeShip(board, 'ship_4', 4, { x: 2, y: 2 }, 'horizontal');

    // Exactly one ship on board
    expect(board.ships).toHaveLength(1);

    const ship = board.ships[0];
    expect(ship.id).toBe('ship_4');
    expect(ship.size).toBe(4);
    expect(ship.positions).toEqual([
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 5, y: 2 },
    ]);
    // No hits initially
    expect(ship.hits).toEqual([false, false, false, false]);
  });

  it('should place a ship via the API and return updated board', async () => {
    const createRes = await request(app)
      .post('/api/game/new')
      .send({ username: 'ac1_user' });
    expect(createRes.status).toBe(201);
    const gameId = createRes.body.id;

    const placeRes = await request(app)
      .post(`/api/game/${gameId}/place`)
      .send({ shipId: 'ship_4', x: 2, y: 2, orientation: 'horizontal' });
    expect(placeRes.status).toBe(200);

    const ships = placeRes.body.playerBoard.ships;
    expect(ships).toHaveLength(1);
    expect(ships[0].id).toBe('ship_4');
    expect(ships[0].positions).toEqual([
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 5, y: 2 },
    ]);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
//  AC2 – Edge placement and adjacency
// ══════════════════════════════════════════════════════════════════════════════

describe('AC2 – Edge placement and adjacency', () => {
  // AC2: Place a size-3 ship at (7,0) horizontal → occupies (7,0), (8,0),
  //      (9,0) — right to the board edge. Also test adjacency is valid.

  it('should allow placing a ship that ends exactly at the right edge', () => {
    let board = createEmptyBoard();
    board = placeShip(board, 'ship_3a', 3, { x: 7, y: 0 }, 'horizontal');

    const ship = board.ships[0];
    expect(ship.positions).toEqual([
      { x: 7, y: 0 },
      { x: 8, y: 0 },
      { x: 9, y: 0 },
    ]);
  });

  it('should allow placing a ship adjacent (touching) to an existing ship', () => {
    // Place first ship at row 0
    let board = createEmptyBoard();
    board = placeShip(board, 'ship_5', 5, { x: 0, y: 0 }, 'horizontal');

    // Place second ship directly adjacent at row 1 — touching is allowed
    board = placeShip(board, 'ship_4', 4, { x: 0, y: 1 }, 'horizontal');

    expect(board.ships).toHaveLength(2);
    expect(board.ships[0].positions[0]).toEqual({ x: 0, y: 0 });
    expect(board.ships[1].positions[0]).toEqual({ x: 0, y: 1 });
  });

  it('should allow placing a ship adjacent diagonally', () => {
    let board = createEmptyBoard();
    // Place at (0,0) horizontal
    board = placeShip(board, 'ship_2', 2, { x: 0, y: 0 }, 'horizontal');
    // Place diagonally adjacent starting at (2,1) — should also be valid
    board = placeShip(board, 'ship_3a', 3, { x: 2, y: 1 }, 'horizontal');

    expect(board.ships).toHaveLength(2);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
//  AC3 – Invalid placement (overflow and overlap)
// ══════════════════════════════════════════════════════════════════════════════

describe('AC3 – Invalid placement (overflow and overlap)', () => {
  // AC3a: Place a size-3 ship at (8,0) horizontal → extends to x=10, should fail.

  it('should reject ship placement that extends outside the board (unit)', () => {
    const board = createEmptyBoard();
    const validation = validateShipPlacement(board, 3, { x: 8, y: 0 }, 'horizontal');
    expect(validation.valid).toBe(false);
    expect(validation.error).toBeDefined();
  });

  it('should throw when placeShip extends outside the board', () => {
    const board = createEmptyBoard();
    expect(() =>
      placeShip(board, 'ship_3a', 3, { x: 8, y: 0 }, 'horizontal')
    ).toThrow();
  });

  // AC3b: Overlap — place a ship where another already exists → should fail.

  it('should reject ship placement that overlaps an existing ship (unit)', () => {
    let board = createEmptyBoard();
    board = placeShip(board, 'ship_5', 5, { x: 0, y: 0 }, 'horizontal');

    const validation = validateShipPlacement(board, 3, { x: 2, y: 0 }, 'horizontal');
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('already occupied');
  });

  it('should throw when placeShip overlaps an existing ship', () => {
    let board = createEmptyBoard();
    board = placeShip(board, 'ship_5', 5, { x: 0, y: 0 }, 'horizontal');

    expect(() =>
      placeShip(board, 'ship_3a', 3, { x: 2, y: 0 }, 'horizontal')
    ).toThrow(/already occupied/);
  });

  // AC3 – API integration tests

  it('should return 400 via API when ship extends outside the board', async () => {
    const createRes = await request(app)
      .post('/api/game/new')
      .send({ username: 'ac3_overflow' });
    const gameId = createRes.body.id;

    const placeRes = await request(app)
      .post(`/api/game/${gameId}/place`)
      .send({ shipId: 'ship_3a', x: 8, y: 0, orientation: 'horizontal' });

    expect(placeRes.status).toBe(400);
    expect(placeRes.body.error).toBeDefined();
  });

  it('should return 400 via API when ship overlaps an existing ship', async () => {
    const createRes = await request(app)
      .post('/api/game/new')
      .send({ username: 'ac3_overlap' });
    const gameId = createRes.body.id;

    // Place first ship
    const place1 = await request(app)
      .post(`/api/game/${gameId}/place`)
      .send({ shipId: 'ship_5', x: 0, y: 0, orientation: 'horizontal' });
    expect(place1.status).toBe(200);

    // Try overlapping ship
    const place2 = await request(app)
      .post(`/api/game/${gameId}/place`)
      .send({ shipId: 'ship_3a', x: 2, y: 0, orientation: 'horizontal' });
    expect(place2.status).toBe(400);
    expect(place2.body.error).toBeDefined();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
//  AC4 – Shooting, bonus shot, and bot response
// ══════════════════════════════════════════════════════════════════════════════

describe('AC4 – Shooting, bonus shot, and bot response', () => {
  // Uses the known bot board from setupBattleGame:
  //   ship_5  → (0,5) (1,5) (2,5) (3,5) (4,5)
  //   ship_4  → (0,6) (1,6) (2,6) (3,6)
  //   ship_3a → (0,7) (1,7) (2,7)
  //   ship_3b → (0,8) (1,8) (2,8)
  //   ship_2  → (0,9) (1,9)

  it('should grant bonus shot (no bot turn) when player HIT on first shot', async () => {
    const { gameId } = await setupBattleGame('ac4_bonus');

    // Shoot a known ship cell → (0,5) is part of ship_5
    const shootRes = await request(app)
      .post(`/api/game/${gameId}/shoot`)
      .send({ x: 0, y: 5 });

    expect(shootRes.status).toBe(200);
    expect(shootRes.body.playerShot.result).toBe('HIT');
    // Bonus should be available
    expect(shootRes.body.bonusShotAvailable).toBe(true);
    // Bot should NOT have shot
    expect(shootRes.body.botShots).toEqual([]);
  });

  it('should end player turn after bonus shot and let bot respond', async () => {
    const { gameId } = await setupBattleGame('ac4_after_bonus');

    // First shot: HIT → grants bonus
    const shot1 = await request(app)
      .post(`/api/game/${gameId}/shoot`)
      .send({ x: 0, y: 5 });
    expect(shot1.body.bonusShotAvailable).toBe(true);
    expect(shot1.body.botShots).toEqual([]);

    // Second shot (bonus): whether HIT or MISS, bot should respond
    // Shoot a MISS cell to make the test more predictable
    const shot2 = await request(app)
      .post(`/api/game/${gameId}/shoot`)
      .send({ x: 9, y: 9 }); // (9,9) is empty on the known bot board
    expect(shot2.status).toBe(200);
    expect(shot2.body.playerShot.result).toBe('MISS');
    // Bot should have taken its turn
    expect(shot2.body.botShots.length).toBeGreaterThan(0);
    // Bonus should be cleared
    expect(shot2.body.bonusShotAvailable).toBe(false);
  });

  it('should let bot respond immediately when player MISS on first shot', async () => {
    const { gameId } = await setupBattleGame('ac4_miss');

    // Shoot a cell that misses → (5,5) is empty on the known bot board
    const shootRes = await request(app)
      .post(`/api/game/${gameId}/shoot`)
      .send({ x: 5, y: 5 });

    expect(shootRes.status).toBe(200);
    expect(shootRes.body.playerShot.result).toBe('MISS');
    expect(shootRes.body.bonusShotAvailable).toBe(false);
    // Bot should have responded
    expect(shootRes.body.botShots.length).toBeGreaterThan(0);
  });

  it('should grant bonus after bonus-shot HIT too (chain does NOT happen — only 1 bonus)', async () => {
    const { gameId } = await setupBattleGame('ac4_bonus_hit');

    // Shot 1: HIT (0,5) → bonus granted
    const shot1 = await request(app)
      .post(`/api/game/${gameId}/shoot`)
      .send({ x: 0, y: 5 });
    expect(shot1.body.playerShot.result).toBe('HIT');
    expect(shot1.body.bonusShotAvailable).toBe(true);
    expect(shot1.body.botShots).toEqual([]);

    // Shot 2 (bonus): HIT (1,5) → bot still fires because it's the bonus shot
    const shot2 = await request(app)
      .post(`/api/game/${gameId}/shoot`)
      .send({ x: 1, y: 5 });
    expect(shot2.body.playerShot.result).toBe('HIT');
    // After the bonus shot, bot takes its turn regardless
    expect(shot2.body.botShots.length).toBeGreaterThan(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
//  AC5 – Last ship sunk, game over
// ══════════════════════════════════════════════════════════════════════════════

describe('AC5 – Last ship sunk, game over', () => {
  // Set up a game where 16 of 17 bot ship cells are already hit.
  // The remaining cell is the LAST cell of ship_2 → (1,9).

  it('should finish the game when the last bot cell is sunk and save to leaderboard', async () => {
    const { gameId } = await setupBattleGame('ac5_winner');

    // Manipulate game state: mark 16 of 17 cells as hit
    const game = gameStore.get(gameId)!;

    // Hit every position of every ship
    for (const ship of game.botBoard.ships) {
      for (let i = 0; i < ship.hits.length; i++) {
        ship.hits[i] = true;
      }
    }

    // Leave exactly ONE cell un-hit: the last cell of ship_2
    const lastShip = game.botBoard.ships.find(s => s.id === 'ship_2')!;
    lastShip.hits[lastShip.hits.length - 1] = false;

    // Update the shots map to reflect the hit/sunk state
    for (const ship of game.botBoard.ships) {
      const allHit = ship.hits.every(h => h);
      for (let i = 0; i < ship.positions.length; i++) {
        if (ship.hits[i]) {
          const key = `${ship.positions[i].x},${ship.positions[i].y}`;
          game.botBoard.shots.set(key, allHit ? 'SUNK' : 'HIT');
        }
      }
    }

    gameStore.set(gameId, game);

    // Now shoot the last un-hit cell: (1,9)
    const shootRes = await request(app)
      .post(`/api/game/${gameId}/shoot`)
      .send({ x: 1, y: 9 });

    expect(shootRes.status).toBe(200);
    // The shot should SUNK the ship
    expect(shootRes.body.playerShot.result).toBe('SUNK');
    // Game should be FINISHED
    expect(shootRes.body.phase).toBe('FINISHED');
    expect(shootRes.body.winner).toBe('player');
    // No bot shots on game end
    expect(shootRes.body.botShots).toEqual([]);

    // Verify leaderboard contains the entry
    const lbRes = await request(app).get('/api/leaderboard');
    expect(lbRes.status).toBe(200);
    const entries = lbRes.body as Array<{ username: string; shots: number; date: string }>;
    const found = entries.find(e => e.username === 'ac5_winner');
    expect(found).toBeDefined();
    expect(found!.shots).toBeGreaterThan(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
//  AC6 – Invalid shots (duplicate and out of bounds)
// ══════════════════════════════════════════════════════════════════════════════

describe('AC6 – Invalid shots (duplicate and out of bounds)', () => {
  it('should return 400 when shooting at negative coordinates', async () => {
    const { gameId } = await setupBattleGame('ac6_neg');

    const res = await request(app)
      .post(`/api/game/${gameId}/shoot`)
      .send({ x: -1, y: 5 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should return 400 when shooting beyond the board (x=10)', async () => {
    const { gameId } = await setupBattleGame('ac6_oob');

    const res = await request(app)
      .post(`/api/game/${gameId}/shoot`)
      .send({ x: 10, y: 2 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should return 400 when shooting the same cell twice', async () => {
    const { gameId } = await setupBattleGame('ac6_dup');

    // First shot at (5,5) — a MISS (empty cell on known bot board)
    const shot1 = await request(app)
      .post(`/api/game/${gameId}/shoot`)
      .send({ x: 5, y: 5 });
    expect(shot1.status).toBe(200);

    // Second shot at same cell → should fail
    const shot2 = await request(app)
      .post(`/api/game/${gameId}/shoot`)
      .send({ x: 5, y: 5 });
    expect(shot2.status).toBe(400);
    expect(shot2.body.error).toContain('already been targeted');
  });

  it('should not change game state or trigger bot on invalid shot', async () => {
    const { gameId } = await setupBattleGame('ac6_nochange');

    // Capture current state
    const stateBefore = await request(app).get(`/api/game/${gameId}`);
    const shotCountBefore = stateBefore.body.playerShotCount;
    const botShotCountBefore = stateBefore.body.botShotCount;

    // Invalid shot
    await request(app)
      .post(`/api/game/${gameId}/shoot`)
      .send({ x: -1, y: 5 });

    // State after should be unchanged
    const stateAfter = await request(app).get(`/api/game/${gameId}`);
    expect(stateAfter.body.playerShotCount).toBe(shotCountBefore);
    expect(stateAfter.body.botShotCount).toBe(botShotCountBefore);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
//  AC7 – Phase violation
// ══════════════════════════════════════════════════════════════════════════════

describe('AC7 – Phase violation', () => {
  it('should return 400 when trying to shoot in PREPARE phase', async () => {
    // Create a new game — it starts in PREPARE
    const createRes = await request(app)
      .post('/api/game/new')
      .send({ username: 'ac7_prepare' });
    expect(createRes.status).toBe(201);
    const gameId = createRes.body.id;
    expect(createRes.body.phase).toBe('PREPARE');

    // Try to shoot
    const shootRes = await request(app)
      .post(`/api/game/${gameId}/shoot`)
      .send({ x: 0, y: 0 });
    expect(shootRes.status).toBe(400);
    expect(shootRes.body.error).toContain('PREPARE');
  });

  it('should return 400 when trying to shoot in FINISHED phase', async () => {
    const { gameId } = await setupBattleGame('ac7_finished');

    // Manually set the game to FINISHED
    const game = gameStore.get(gameId)!;
    game.phase = 'FINISHED';
    game.winner = 'player';
    gameStore.set(gameId, game);

    // Try to shoot
    const shootRes = await request(app)
      .post(`/api/game/${gameId}/shoot`)
      .send({ x: 0, y: 0 });
    expect(shootRes.status).toBe(400);
    expect(shootRes.body.error).toContain('FINISHED');
  });

  it('should return 400 when trying to place a ship in BATTLE phase', async () => {
    const { gameId } = await setupBattleGame('ac7_battle_place');

    const placeRes = await request(app)
      .post(`/api/game/${gameId}/place`)
      .send({ shipId: 'ship_2', x: 5, y: 5, orientation: 'horizontal' });
    expect(placeRes.status).toBe(400);
    expect(placeRes.body.error).toBeDefined();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
//  AC4 (determinism) – Seedable / injectable bot RNG
// ══════════════════════════════════════════════════════════════════════════════

describe('AC4 (determinism) – Seedable bot RNG', () => {
  // The spec requires the bot RNG to be injectable/seedable so automated tests
  // are 100% deterministic. These tests prove that identical seeds yield
  // identical bot behaviour (board generation + target selection), while
  // different seeds diverge.

  // AC4: generateBotBoard is reproducible for the same seed (unit).
  it('should generate an identical bot board for the same seed', () => {
    const boardA = generateBotBoard(createSeededRng(12345));
    const boardB = generateBotBoard(createSeededRng(12345));

    // Same number of ships, same positions in the same order.
    expect(boardA.ships).toHaveLength(SHIP_SIZES.length);
    expect(boardB.ships).toHaveLength(SHIP_SIZES.length);

    const serialize = (b: typeof boardA) =>
      b.ships.map((s) => ({ id: s.id, positions: s.positions }));

    expect(serialize(boardA)).toEqual(serialize(boardB));
  });

  // AC4: different seeds should (with overwhelming probability) differ.
  it('should generate a different bot board for a different seed', () => {
    const boardA = generateBotBoard(createSeededRng(1));
    const boardB = generateBotBoard(createSeededRng(999999));

    const serialize = (b: typeof boardA) =>
      JSON.stringify(b.ships.map((s) => ({ id: s.id, positions: s.positions })));

    expect(serialize(boardA)).not.toEqual(serialize(boardB));
  });

  // AC4: a seeded game created through the API produces a reproducible bot
  //      board, and the bot's shots are deterministic end-to-end.
  it('should produce reproducible bot shots across two identically seeded games', async () => {
    const playFirstMiss = async (seed: number) => {
      // Create a seeded game
      const createRes = await request(app)
        .post('/api/game/new')
        .send({ username: `det_${seed}`, seed });
      const gameId: string = createRes.body.id;

      // Place the standard player fleet
      for (const p of PLAYER_PLACEMENTS) {
        await request(app).post(`/api/game/${gameId}/place`).send(p);
      }

      // Start → bot board generated from the seeded RNG
      await request(app).post(`/api/game/${gameId}/start`).send();

      // Player fires at a guaranteed-empty-looking cell. Even if it is a HIT,
      // we keep firing until the player's turn ends so the bot responds.
      // Shooting (9,9) then (8,9) etc. guarantees a MISS path on most boards,
      // but to stay robust we simply fire once and capture the bot shots that
      // come back in the same turn once the player's turn ends.
      let botShots: Array<{ coordinate: { x: number; y: number } }> = [];
      // Fire sequentially until the response includes a bot turn.
      const probeCells = [
        { x: 9, y: 9 }, { x: 8, y: 9 }, { x: 9, y: 8 }, { x: 7, y: 9 },
      ];
      for (const cell of probeCells) {
        const r = await request(app)
          .post(`/api/game/${gameId}/shoot`)
          .send(cell);
        if (r.body.botShots && r.body.botShots.length > 0) {
          botShots = r.body.botShots;
          break;
        }
      }
      return botShots.map((s) => s.coordinate);
    };

    const shotsSeedA1 = await playFirstMiss(42);
    const shotsSeedA2 = await playFirstMiss(42);

    // Same seed → identical bot targeting.
    expect(shotsSeedA1.length).toBeGreaterThan(0);
    expect(shotsSeedA1).toEqual(shotsSeedA2);
  });
});
