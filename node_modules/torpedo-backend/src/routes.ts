import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { GameState, Coordinate, Orientation, ShotResult, RngFunction } from './types';
import {
  createEmptyBoard, placeShip, allShipsPlaced, processShot,
  allShipsSunk, assertPhase, SHIP_SIZES, SHIP_IDS, TOTAL_SHIP_CELLS
} from './gameLogic';
import { generateBotBoard, executeBotTurn, createSeededRng } from './botLogic';
import { gameStore } from './store';
import { addLeaderboardEntry, getLeaderboard } from './leaderboard';

const router = Router();

// Helper: serialize game state for client (HIDE bot ship positions in BATTLE!)
function serializeGameForClient(game: GameState) {
  const playerShips = game.playerBoard.ships.map(s => ({
    id: s.id,
    size: s.size,
    positions: s.positions,
    hits: s.hits,
  }));

  const playerShots: Record<string, string> = {};
  game.playerBoard.shots.forEach((v, k) => { playerShots[k] = v; });

  const botShots: Record<string, string> = {};
  game.botBoard.shots.forEach((v, k) => { botShots[k] = v; });

  // CRITICAL: Only show bot ships if game is FINISHED
  const botShips = game.phase === 'FINISHED'
    ? game.botBoard.ships.map(s => ({
        id: s.id,
        size: s.size,
        positions: s.positions,
        hits: s.hits,
      }))
    : undefined;

  return {
    id: game.id,
    username: game.username,
    phase: game.phase,
    winner: game.winner,
    playerShotCount: game.playerShotCount,
    botShotCount: game.botShotCount,
    bonusShotAvailable: game.bonusShotAvailable,
    playerBoard: {
      ships: playerShips,
      shots: playerShots,
    },
    botBoard: {
      ships: botShips,
      shots: botShots,
    },
  };
}

// POST /api/game/new - Create a new game
router.post('/api/game/new', (req: Request, res: Response) => {
  const { username, seed } = req.body;
  if (!username || typeof username !== 'string' || username.trim().length === 0) {
    return res.status(400).json({ error: 'Username is required' });
  }

  // If a numeric seed is supplied, use a deterministic (seeded) RNG so that
  // bot board generation and bot targeting are fully reproducible. Otherwise
  // fall back to Math.random for normal play.
  const rng: RngFunction =
    typeof seed === 'number' && Number.isFinite(seed)
      ? createSeededRng(seed)
      : Math.random;

  const id = uuidv4();
  const game: GameState = {
    id,
    username: username.trim(),
    phase: 'PREPARE',
    playerBoard: createEmptyBoard(),
    botBoard: createEmptyBoard(),
    playerShotCount: 0,
    botShotCount: 0,
    winner: null,
    bonusShotAvailable: false,
    rng,
  };

  gameStore.set(id, game);
  return res.status(201).json(serializeGameForClient(game));
});

// GET /api/game/:id - Get game state
router.get('/api/game/:id', (req: Request, res: Response) => {
  const game = gameStore.get(req.params.id);
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }
  return res.json(serializeGameForClient(game));
});

// POST /api/game/:id/place - Place a ship
router.post('/api/game/:id/place', (req: Request, res: Response) => {
  const game = gameStore.get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Game not found' });

  try {
    assertPhase(game, 'PREPARE');
  } catch (e: unknown) {
    return res.status(400).json({ error: (e as Error).message });
  }

  const { shipId, x, y, orientation } = req.body;

  // Validate shipId
  const shipIndex = SHIP_IDS.indexOf(shipId);
  if (shipIndex === -1) {
    return res.status(400).json({ error: `Invalid ship ID: ${shipId}` });
  }

  const size = SHIP_SIZES[shipIndex];
  const start: Coordinate = { x: Number(x), y: Number(y) };
  const orient: Orientation = orientation === 'vertical' ? 'vertical' : 'horizontal';

  try {
    game.playerBoard = placeShip(game.playerBoard, shipId, size, start, orient);
    gameStore.set(game.id, game);
    return res.json(serializeGameForClient(game));
  } catch (e: unknown) {
    return res.status(400).json({ error: (e as Error).message });
  }
});

// POST /api/game/:id/start - Start the battle (transition PREPARE -> BATTLE)
router.post('/api/game/:id/start', (req: Request, res: Response) => {
  const game = gameStore.get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Game not found' });

  try {
    assertPhase(game, 'PREPARE');
  } catch (e: unknown) {
    return res.status(400).json({ error: (e as Error).message });
  }

  if (!allShipsPlaced(game.playerBoard)) {
    return res.status(400).json({ error: 'All ships must be placed before starting the battle' });
  }

  // Generate bot board using the game's injectable RNG (seedable for tests)
  game.botBoard = generateBotBoard(game.rng);
  game.phase = 'BATTLE';
  game.bonusShotAvailable = false;
  gameStore.set(game.id, game);

  return res.json(serializeGameForClient(game));
});

// POST /api/game/:id/shoot - Player shoots
router.post('/api/game/:id/shoot', (req: Request, res: Response) => {
  const game = gameStore.get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Game not found' });

  try {
    assertPhase(game, 'BATTLE');
  } catch (e: unknown) {
    return res.status(400).json({ error: (e as Error).message });
  }

  const x = Number(req.body.x);
  const y = Number(req.body.y);

  if (isNaN(x) || isNaN(y)) {
    return res.status(400).json({ error: 'Invalid coordinates' });
  }

  let playerResult: ShotResult;
  try {
    playerResult = processShot(game.botBoard, { x, y });
  } catch (e: unknown) {
    return res.status(400).json({ error: (e as Error).message });
  }

  game.playerShotCount++;
  const isBonus = game.bonusShotAvailable;

  // Check if player just won
  if (allShipsSunk(game.botBoard)) {
    game.phase = 'FINISHED';
    game.winner = 'player';
    game.bonusShotAvailable = false;
    gameStore.set(game.id, game);

    // Add to leaderboard
    addLeaderboardEntry({
      username: game.username,
      shots: game.playerShotCount,
      date: new Date().toISOString(),
    });

    return res.json({
      ...serializeGameForClient(game),
      playerShot: playerResult,
      botShots: [],
    });
  }

  // Determine if it's bonus or if bot should respond
  let botShots: ShotResult[] = [];

  if (!isBonus && (playerResult.result === 'HIT' || playerResult.result === 'SUNK')) {
    // Player hit on first shot: grant bonus, no bot turn
    game.bonusShotAvailable = true;
    gameStore.set(game.id, game);
    return res.json({
      ...serializeGameForClient(game),
      playerShot: playerResult,
      botShots: [],
    });
  }

  // Either player missed on first shot, or this was the bonus shot
  // Either way, player's turn is over. Bot shoots.
  game.bonusShotAvailable = false;

  // Execute bot turn using the game's injectable RNG (seedable for tests)
  botShots = executeBotTurn(game.playerBoard, game.rng);
  game.botShotCount += botShots.length;

  // Check if bot won
  if (allShipsSunk(game.playerBoard)) {
    game.phase = 'FINISHED';
    game.winner = 'bot';
    game.bonusShotAvailable = false;
  }

  gameStore.set(game.id, game);

  return res.json({
    ...serializeGameForClient(game),
    playerShot: playerResult,
    botShots,
  });
});

// GET /api/leaderboard - Get top scores
router.get('/api/leaderboard', (_req: Request, res: Response) => {
  const entries = getLeaderboard();
  return res.json(entries);
});

export default router;
