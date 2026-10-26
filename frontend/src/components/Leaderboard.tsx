import { useState, useEffect } from 'react';
import type { LeaderboardEntry } from '../types';
import { getLeaderboard } from '../api';

interface LeaderboardProps {
  onBack: () => void;
}

function Leaderboard({ onBack }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        const data = await getLeaderboard();
        if (!cancelled) {
          setEntries(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Hiba a toplista betöltésekor');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, []);

  const getRankClass = (rank: number): string => {
    if (rank === 1) return 'rank-gold';
    if (rank === 2) return 'rank-silver';
    if (rank === 3) return 'rank-bronze';
    return '';
  };

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('hu-HU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="leaderboard-container">
      <h2>🏆 Toplista</h2>

      {loading && <div className="loading-spinner">Betöltés...</div>}
      {error && <div className="error-message">{error}</div>}

      {!loading && !error && entries.length === 0 && (
        <div className="leaderboard-empty">
          Még nincs bejegyzés a toplistán. Légy te az első győztes!
        </div>
      )}

      {!loading && !error && entries.length > 0 && (
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Játékos</th>
              <th>Lövések</th>
              <th>Dátum</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => {
              const rank = index + 1;
              return (
                <tr key={`${entry.username}-${entry.date}-${index}`}>
                  <td className={getRankClass(rank)}>
                    {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                  </td>
                  <td>{entry.username}</td>
                  <td>{entry.shots}</td>
                  <td>{formatDate(entry.date)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <button className="btn btn-secondary" onClick={onBack}>
        ← Vissza
      </button>
    </div>
  );
}

export default Leaderboard;
