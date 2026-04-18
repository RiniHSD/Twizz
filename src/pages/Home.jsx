import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection } from 'firebase/firestore';

function Home() {
  const [gameCode, setGameCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!gameCode || !playerName) {
      setError("Please enter a Game PIN and a Nickname");
      return;
    }
    setLoading(true);
    setError('');

    try {
      const codeStr = gameCode.trim();
      const gameRef = doc(db, 'games', codeStr);
      const gameSnap = await getDoc(gameRef);

      if (!gameSnap.exists()) {
        setError('Game not found! Please check the PIN.');
        setLoading(false);
        return;
      }

      const gameData = gameSnap.data();
      if (gameData.status === 'finished') {
        setError('This game has already finished.');
        setLoading(false);
        return;
      }

      // Generate a simple unique ID for player using timestamp + random
      const playerId = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Add player to the game's players subcollection
      const playerRef = doc(db, `games/${codeStr}/players`, playerId);
      await setDoc(playerRef, {
        name: playerName,
        score: 0,
        joinedAt: new Date()
      });

      // Save playerId to localStorage so we can identify this user in the quiz page
      localStorage.setItem(`tuizz_playerId_${codeStr}`, playerId);

      // Navigate to the play room
      navigate(`/play/${codeStr}`);
    } catch (err) {
      console.error(err);
      setError('Error joining the game. Are you connected to internet?');
    }
    setLoading(false);
  };

  return (
    <div className="card" style={{ maxWidth: '400px', textAlign: 'center' }}>
      <h1 className="title" style={{ marginBottom: '1rem' }}>Twizz!</h1>
      <p className="subtitle" style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>Titian Quizz for Safety Induction</p>

      {error && <div style={{ color: 'var(--color-red)', marginBottom: '1rem', fontWeight: 'bold' }}>{error}</div>}

      <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Game PIN"
          className="input-field"
          value={gameCode}
          onChange={(e) => setGameCode(e.target.value)}
          maxLength={6}
          style={{ fontSize: '1.5rem', letterSpacing: '2px' }}
        />
        <input
          type="text"
          placeholder="Nickname"
          className="input-field"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          maxLength={20}
        />
        <button type="submit" className="btn btn-dark" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'var(--color-dark)', color: 'white' }} disabled={loading}>
          {loading ? 'Joining...' : 'Enter'}
        </button>
      </form>
    </div>
  );
}

export default Home;
