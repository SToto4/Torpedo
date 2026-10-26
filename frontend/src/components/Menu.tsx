import { useState } from 'react';
import type { GameState } from '../types';
import { createGame } from '../api';

interface MenuProps {
  username: string;
  onNewGame: (gameState: GameState) => void;
  onShowLeaderboard: () => void;
  onLogout: () => void;
}

function Menu({ username, onNewGame, onShowLeaderboard, onLogout }: MenuProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNewGame = async () => {
    setLoading(true);
    setError(null);
    try {
      const gameState = await createGame(username);
      onNewGame(gameState);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hiba történt a játék létrehozásakor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="menu-container">
      <h2>Szia, {username}! 👋</h2>

      {error && <div className="error-message">{error}</div>}

      <div className="menu-buttons">
        <button
          className="btn btn-primary"
          onClick={handleNewGame}
          disabled={loading}
        >
          {loading ? 'Létrehozás...' : '🎯 Új játék'}
        </button>
        <button
          className="btn btn-secondary"
          onClick={onShowLeaderboard}
          disabled={loading}
        >
          🏆 Toplista
        </button>
      </div>

      <button className="menu-logout" onClick={onLogout}>
        Kijelentkezés
      </button>
    </div>
  );
}

export default Menu;
