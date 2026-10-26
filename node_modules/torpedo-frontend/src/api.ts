import type { GameState, ShootResponse, LeaderboardEntry } from './types';

const BASE_URL = '/api';

/**
 * Generic fetch wrapper with error handling.
 */
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: 'Ismeretlen hiba' }));
    throw new Error(errorBody.error || `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

/** Create a new game */
export function createGame(username: string): Promise<GameState> {
  return request<GameState>('/game/new', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
}

/** Get current game state */
export function getGame(gameId: string): Promise<GameState> {
  return request<GameState>(`/game/${gameId}`);
}

/** Place a ship on the player's board */
export function placeShip(
  gameId: string,
  shipId: string,
  x: number,
  y: number,
  orientation: 'horizontal' | 'vertical'
): Promise<GameState> {
  return request<GameState>(`/game/${gameId}/place`, {
    method: 'POST',
    body: JSON.stringify({ shipId, x, y, orientation }),
  });
}

/** Start the battle (transition PREPARE → BATTLE) */
export function startBattle(gameId: string): Promise<GameState> {
  return request<GameState>(`/game/${gameId}/start`, {
    method: 'POST',
  });
}

/** Fire a shot at the bot's board */
export function shoot(gameId: string, x: number, y: number): Promise<ShootResponse> {
  return request<ShootResponse>(`/game/${gameId}/shoot`, {
    method: 'POST',
    body: JSON.stringify({ x, y }),
  });
}

/** Get the leaderboard */
export function getLeaderboard(): Promise<LeaderboardEntry[]> {
  return request<LeaderboardEntry[]>('/leaderboard');
}
