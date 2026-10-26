import { useState } from 'react';
import type { AppView, GameState } from './types';
import Login from './components/Login';
import Menu from './components/Menu';
import Leaderboard from './components/Leaderboard';
import Game from './components/Game';
import './App.css';

function App() {
  const [view, setView] = useState<AppView>('login');
  const [username, setUsername] = useState('');
  const [gameState, setGameState] = useState<GameState | null>(null);

  const handleLogin = (name: string) => {
    setUsername(name);
    setView('menu');
  };

  const handleLogout = () => {
    setUsername('');
    setGameState(null);
    setView('login');
  };

  const handleNewGame = (state: GameState) => {
    setGameState(state);
    setView('game');
  };

  const handleBackToMenu = () => {
    setGameState(null);
    setView('menu');
  };

  return (
    <div className="app">
      <h1 className="app-title">⚓ Torpedo ⚓</h1>

      {view === 'login' && (
        <Login onLogin={handleLogin} />
      )}

      {view === 'menu' && (
        <Menu
          username={username}
          onNewGame={handleNewGame}
          onShowLeaderboard={() => setView('leaderboard')}
          onLogout={handleLogout}
        />
      )}

      {view === 'leaderboard' && (
        <Leaderboard onBack={() => setView('menu')} />
      )}

      {view === 'game' && gameState && (
        <Game
          initialGameState={gameState}
          onMenu={handleBackToMenu}
          onNewGame={handleNewGame}
          username={username}
        />
      )}
    </div>
  );
}

export default App;
