import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, onSnapshot, updateDoc, collection } from 'firebase/firestore';
import Leaderboard from '../components/Leaderboard';
import { Users, Play, SkipForward, CheckCircle } from 'lucide-react';

function HostView() {
  const { gameCode } = useParams();
  const [game, setGame] = useState(null);
  const [playersCount, setPlayersCount] = useState(0);
  const startTimesRef = React.useRef({});
  const [timeLeft, setTimeLeft] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubGame = onSnapshot(doc(db, 'games', gameCode), (doc) => {
      if (doc.exists()) {
        setGame(doc.data());
      }
    });

    const unsubPlayers = onSnapshot(collection(db, `games/${gameCode}/players`), (snapshot) => {
      setPlayersCount(snapshot.size);
    });

    return () => {
      unsubGame();
      unsubPlayers();
    };
  }, [gameCode]);

  useEffect(() => {
    if (game && game.status === 'active' && game.currentQuestionIndex >= 0) {
      const qIdx = game.currentQuestionIndex;
      if (!startTimesRef.current[qIdx]) {
        startTimesRef.current[qIdx] = Date.now();
      }

      const q = game.questions[qIdx];
      const limitMs = q.timeLimit * 1000;

      const interval = setInterval(() => {
        const elapsed = Date.now() - startTimesRef.current[qIdx];
        const remaining = Math.max(0, Math.ceil((limitMs - elapsed) / 1000));
        setTimeLeft(remaining);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [game?.status, game?.currentQuestionIndex]);

  if (!game) return <div className="center-vertical"><p>Loading game room...</p></div>;

  const handleStartGame = async () => {
    await updateDoc(doc(db, 'games', gameCode), {
      status: 'active',
      currentQuestionIndex: 0,
      questionStartTime: Date.now()
    });
  };

  const handleNextQuestion = async () => {
    const nextIdx = game.currentQuestionIndex + 1;
    if (nextIdx < game.questions.length) {
      await updateDoc(doc(db, 'games', gameCode), {
        currentQuestionIndex: nextIdx,
        questionStartTime: Date.now()
      });
    } else {
      await updateDoc(doc(db, 'games', gameCode), {
        status: 'finished'
      });
    }
  };

  const isFinished = game.status === 'finished';
  const isStarted = game.status !== 'waiting';
  const currentQ = isStarted && !isFinished ? game.questions[game.currentQuestionIndex] : null;

  return (
    <div className="card" style={{ maxWidth: '1000px', width: '100%', textAlign: 'center', background: '#f5f5f5' }}>
      <h2 style={{ fontSize: '2rem', marginBottom: '10px', color: '#555' }}>{game.title}</h2>

      {!isStarted && (
        <>
          <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '16px', margin: '20px 0', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}>
            <p style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Join at <strong>tuizz-97ce4.web.app</strong> (or this site) with PIN:</p>
            <h1 style={{ fontSize: '6rem', letterSpacing: '8px', margin: '10px 0', fontFamily: 'Montserrat, sans-serif' }}>
              {gameCode}
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', marginBottom: '30px' }}>
            <Users size={36} style={{ marginRight: '15px' }} />
            <strong>{playersCount}</strong> Players Joined
          </div>

          <button onClick={handleStartGame} className="btn btn-primary" style={{ fontSize: '1.8rem', padding: '20px 50px' }} disabled={playersCount === 0}>
            <Play size={30} style={{ marginRight: '10px' }} /> Start Quiz Now
          </button>
        </>
      )}

      {isStarted && !isFinished && (
        <div style={{ margin: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '800px', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.5rem', color: '#666', margin: 0 }}>
              Question {game.currentQuestionIndex + 1} of {game.questions.length} • Type: {currentQ?.type.toUpperCase()}
            </h3>
            <div className="timer-circle" style={{margin:0, width:'80px', height:'80px', fontSize:'2.5rem', flexShrink: 0}}>{timeLeft}</div>
          </div>

          <div style={{ fontSize: '2.5rem', fontFamily: 'Montserrat', fontWeight: '800', background: 'white', padding: '30px', borderRadius: '16px', width: '100%', boxShadow: '0 8px 0 rgba(0,0,0,0.05)', marginBottom: '20px' }}>
            {currentQ?.text}
          </div>

          {currentQ?.image && (
            <img src={currentQ.image} alt="Question media" style={{ maxHeight: '400px', borderRadius: '16px', boxShadow: '0 8px 16px rgba(0,0,0,0.15)' }} />
          )}

          <div style={{ marginTop: '40px', width: '100%', maxWidth: '800px' }}>
            <Leaderboard gameCode={gameCode} />
          </div>

          <div style={{ marginTop: '40px' }}>
            <button onClick={handleNextQuestion} className="btn btn-primary" style={{ fontSize: '1.8rem', padding: '15px 50px' }}>
              <SkipForward size={28} style={{ marginRight: '10px' }} />
              {game.currentQuestionIndex + 1 === game.questions.length ? 'Finish Quiz' : 'Next Question'}
            </button>
          </div>
        </div>
      )}

      {isFinished && (
        <div style={{ margin: '40px 0' }}>
          <CheckCircle size={80} color="var(--color-green)" style={{ marginBottom: '20px', display: 'inline-block' }} />
          <h1 style={{ fontSize: '4rem', marginBottom: '30px', fontFamily: 'Montserrat' }}>Podium</h1>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <Leaderboard gameCode={gameCode} />
          </div>

          <button onClick={() => navigate('/admin')} className="btn" style={{ marginTop: '40px', fontSize: '1.2rem', padding: '15px 30px' }}>
            Create New Quiz
          </button>
        </div>
      )}
    </div>
  );
}

export default HostView;
