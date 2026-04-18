import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';

function Leaderboard({ gameCode }) {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    if (!gameCode) return;

    const q = query(
      collection(db, `games/${gameCode}/players`),
      orderBy('score', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const topPlayers = [];
      snapshot.forEach(doc => {
        topPlayers.push({ id: doc.id, ...doc.data() });
      });
      setPlayers(topPlayers);
    });

    return () => unsubscribe();
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
