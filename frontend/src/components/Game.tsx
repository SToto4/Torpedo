import { useState, useEffect, useCallback } from 'react';
import type { GameState, Orientation, ShootResponse } from '../types';
import { SHIP_DEFINITIONS } from '../types';
import { placeShip, startBattle, shoot, createGame } from '../api';
import Board from './Board';
import ShipSelector from './ShipSelector';

interface GameProps {
  initialGameState: GameState;
  onMenu: () => void;
  onNewGame: (gameState: GameState) => void;
  username: string;
}

function Game({ initialGameState, onMenu, onNewGame, username }: GameProps) {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [selectedShipId, setSelectedShipId] = useState<string | null>(null);
  const [orientation, setOrientation] = useState<Orientation>('horizontal');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastShotResult, setLastShotResult] = useState<string | null>(null);
  const [sunkPositions, setSunkPositions] = useState<Set<string>>(new Set());

  // Track which ships have been placed
  const placedShipIds = new Set(
    (gameState.playerBoard.ships ?? []).map((s) => s.id)
  );

  const allShipsPlaced = placedShipIds.size === SHIP_DEFINITIONS.length;

  // Get the selected ship definition
  const selectedShipDef = selectedShipId
    ? SHIP_DEFINITIONS.find((s) => s.id === selectedShipId)
    : undefined;

  // 'R' key rotation listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        setOrientation((prev) => (prev === 'horizontal' ? 'vertical' : 'horizontal'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-select the first unplaced ship
  useEffect(() => {
    if (gameState.phase === 'PREPARE' && selectedShipId === null) {
      const firstUnplaced = SHIP_DEFINITIONS.find((s) => !placedShipIds.has(s.id));
      if (firstUnplaced) {
        setSelectedShipId(firstUnplaced.id);
      }
    }
  }, [gameState.phase, placedShipIds, selectedShipId]);

  // Handle ship placement
  const handlePlaceShip = useCallback(
    async (x: number, y: number) => {
      if (!selectedShipId || loading) return;

      setError(null);
      setLoading(true);
      try {
        const newState = await placeShip(gameState.id, selectedShipId, x, y, orientation);
        setGameState(newState);

        // Auto-select next unplaced ship
        const newPlaced = new Set((newState.playerBoard.ships ?? []).map((s) => s.id));
        const nextShip = SHIP_DEFINITIONS.find((s) => !newPlaced.has(s.id));
        setSelectedShipId(nextShip ? nextShip.id : null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Hiba a hajó elhelyezésekor');
      } finally {
        setLoading(false);
      }
    },
    [selectedShipId, orientation, gameState.id, loading]
  );

  // Handle start battle
  const handleStartBattle = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const newState = await startBattle(gameState.id);
      setGameState(newState);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hiba a csata indításakor');
    } finally {
      setLoading(false);
    }
  }, [gameState.id]);

  // Handle shooting
  const handleShoot = useCallback(
    async (x: number, y: number) => {
      if (loading) return;

      setError(null);
      setLoading(true);
      setLastShotResult(null);
      try {
        const response: ShootResponse = await shoot(gameState.id, x, y);

        // Track sunk ship positions
        if (response.playerShot.sunkShip) {
          setSunkPositions((prev) => {
            const next = new Set(prev);
            for (const pos of response.playerShot.sunkShip!) {
              next.add(`${pos.x},${pos.y}`);
            }
            return next;
          });
        }

        // Build status message
        const resultEmoji =
          response.playerShot.result === 'MISS'
            ? '💨 Mellé!'
            : response.playerShot.result === 'HIT'
              ? '💥 Találat!'
              : '🔥 Elsüllyedt!';

        let statusMsg = `Te: ${resultEmoji}`;

        if (response.botShots && response.botShots.length > 0) {
          const botResults = response.botShots.map((s) =>
            s.result === 'MISS' ? '💨' : s.result === 'HIT' ? '💥' : '🔥'
          );
          statusMsg += ` | Bot: ${botResults.join(', ')}`;
        }

        if (response.bonusShotAvailable) {
          statusMsg += ' | 🎯 Bónusz lövés!';
        }

        setLastShotResult(statusMsg);
        setGameState(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Hiba a lövés közben');
      } finally {
        setLoading(false);
      }
    },
    [gameState.id, loading]
  );

  // Handle new game from finished screen
  const handleNewGame = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const newState = await createGame(username);
      setSunkPositions(new Set());
      setLastShotResult(null);
      setSelectedShipId(null);
      setOrientation('horizontal');
      onNewGame(newState);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hiba az új játék létrehozásakor');
    } finally {
      setLoading(false);
    }
  }, [username, onNewGame]);

  const { phase } = gameState;

  return (
    <div className="game-container">
      {/* Status bar */}
      <div className="game-status">
        <h2>{gameState.username} csatája</h2>
        <span
          className={`phase-badge ${
            phase === 'PREPARE'
              ? 'phase-prepare'
              : phase === 'BATTLE'
                ? 'phase-battle'
                : 'phase-finished'
          }`}
        >
          {phase === 'PREPARE'
            ? '📋 Előkészítés'
            : phase === 'BATTLE'
              ? '⚔️ Csata'
              : '🏁 Vége'}
        </span>
      </div>

      {/* Info bar */}
      {phase !== 'PREPARE' && (
        <div className="game-info-bar">
          <div className="game-info-item">
            Te lövéseid: <span>{gameState.playerShotCount}</span>
          </div>
          <div className="game-info-item">
            Bot lövései: <span>{gameState.botShotCount}</span>
          </div>
          {phase === 'BATTLE' && gameState.bonusShotAvailable && (
            <div className="bonus-indicator">🎯 BÓNUSZ LÖVÉS</div>
          )}
        </div>
      )}

      {/* Last shot result */}
      {lastShotResult && phase === 'BATTLE' && (
        <div className="game-info-bar">
          <div className="game-info-item" style={{ fontSize: '1rem' }}>
            {lastShotResult}
          </div>
        </div>
      )}

      {/* Finished overlay */}
      {phase === 'FINISHED' && (
        <div className="finished-overlay">
          <div
            className={`finished-banner ${
              gameState.winner === 'player' ? 'banner-victory' : 'banner-defeat'
            }`}
          >
            {gameState.winner === 'player' ? '🎉 Győzelem! 🎉' : '💀 Vereség! 💀'}
          </div>
          <div className="finished-stats">
            <div>
              Te lövéseid: <span>{gameState.playerShotCount}</span>
            </div>
            <div>
              Bot lövései: <span>{gameState.botShotCount}</span>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && <div className="error-message">{error}</div>}

      {/* Boards */}
      <div className="game-boards">
        {/* Player's board */}
        <div className="board-section">
          <h3>🛡️ Saját tábla</h3>
          <Board
            board={gameState.playerBoard}
            mode="view"
            showShips={true}
          />
        </div>

        {/* PREPARE: Ship Selector */}
        {phase === 'PREPARE' && (
          <div className="board-section">
            <h3>📐 Elhelyezés</h3>
            <Board
              board={gameState.playerBoard}
              mode="place"
              showShips={true}
              placingShip={
                selectedShipDef
                  ? { size: selectedShipDef.size, orientation }
                  : undefined
              }
              onCellClick={handlePlaceShip}
            />
            <div className="rotation-hint">
              Forgatás: nyomd meg az <strong>R</strong> billentyűt (
              {orientation === 'horizontal' ? '→ Vízszintes' : '↓ Függőleges'})
            </div>
          </div>
        )}

        {/* BATTLE / FINISHED: Bot board */}
        {(phase === 'BATTLE' || phase === 'FINISHED') && (
          <div className="board-section">
            <h3>🎯 Ellenség táblája</h3>
            <Board
              board={gameState.botBoard}
              mode={phase === 'BATTLE' ? 'shoot' : 'view'}
              showShips={phase === 'FINISHED'}
              sunkPositions={phase === 'BATTLE' ? sunkPositions : undefined}
              onCellClick={phase === 'BATTLE' ? handleShoot : undefined}
            />
          </div>
        )}

        {/* Ship selector panel for PREPARE */}
        {phase === 'PREPARE' && (
          <div className="board-section">
            <ShipSelector
              ships={SHIP_DEFINITIONS}
              placedShipIds={placedShipIds}
              selectedShipId={selectedShipId}
              onSelect={setSelectedShipId}
            />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="game-actions">
        {phase === 'PREPARE' && allShipsPlaced && (
          <button
            className="btn btn-success"
            onClick={handleStartBattle}
            disabled={loading}
          >
            {loading ? 'Indítás...' : '⚔️ Csata indítása!'}
          </button>
        )}

        {phase === 'FINISHED' && (
          <>
            <button
              className="btn btn-primary"
              onClick={handleNewGame}
              disabled={loading}
            >
              🎯 Új játék
            </button>
            <button
              className="btn btn-secondary"
              onClick={onMenu}
              disabled={loading}
            >
              📋 Menü
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default Game;
