import { useState } from 'react';

interface LoginProps {
  onLogin: (username: string) => void;
}

function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (trimmed.length > 0) {
      onLogin(trimmed);
    }
  };

  return (
    <div className="login-container">
      <h2>Üdvözöllek a Torpedó játékban!</h2>
      <form className="login-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Add meg a neved..."
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
          maxLength={30}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={username.trim().length === 0}
        >
          Belépés
        </button>
      </form>
    </div>
  );
}

export default Login;
