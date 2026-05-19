import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';

function Leaderboard({ gameCode }) {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    if (!gameCode) return;

    const fetchLeaderboard = async () => {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('game_code', gameCode)
        .order('score', { ascending: false })
        .limit(10);
      if (!error && data) {
        setPlayers(data);
      }
    };

    fetchLeaderboard();

    // Subscribe to any updates to players in this game room
    const channel = supabase
      .channel(`leaderboard_${gameCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `game_code=eq.${gameCode}`
        },
        () => {
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameCode]);

  return (
    <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
      <h3 className="subtitle" style={{ textAlign: 'center' }}>Top 10 Leaderboard</h3>
      <ul className="leaderboard-list">
        {players.length === 0 ? (
          <p style={{ textAlign: 'center', opacity: 0.7 }}>Waiting for players...</p>
        ) : (
          players.map((p, idx) => (
            <li key={p.id} className="leaderboard-item animate-slide-in" style={{ animationDelay: `${idx * 0.1}s` }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', width: '30px', marginRight: '15px' }}>
                  {idx + 1}
                </span>
                <span>{p.name}</span>
              </div>
              <span className="score-badge">{Math.round(p.score)} pts</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export default Leaderboard;
