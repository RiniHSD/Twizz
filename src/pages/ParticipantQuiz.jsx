import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';
import { doc, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { Triangle, Square, Circle, Diamond, Check, X } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const COLORS = ['btn-red', 'btn-blue', 'btn-yellow', 'btn-green'];
const ICONS = [Triangle, Diamond, Circle, Square];

function ParticipantQuiz() {
  const { gameCode } = useParams();
  const [game, setGame] = useState(null);
  const [player, setPlayer] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const startTimesRef = React.useRef({});

  const playerId = localStorage.getItem(`tuizz_playerId_${gameCode}`);

  useEffect(() => {
    if (!playerId) return;
    const unsubGame = onSnapshot(doc(db, 'games', gameCode), (doc) => {
      if (doc.exists()) setGame(doc.data());
    });
    const unsubPlayer = onSnapshot(doc(db, `games/${gameCode}/players`, playerId), (doc) => {
      if (doc.exists()) setPlayer(doc.data());
    });
    return () => { unsubGame(); unsubPlayer(); };
  }, [gameCode, playerId]);

  useEffect(() => {
    setHasSubmitted(false);
    setFeedback(null);
    setSelectedAnswers([]);
    
    if (game?.currentQuestionIndex >= 0 && game?.questions) {
       const q = game.questions[game.currentQuestionIndex];
       if (q && q.type === 'order') {
          // Shuffle them for the user initially
          let initialItems = q.options.map((o, idx) => ({ id: idx.toString(), orgIdx: idx, ...o }));
          initialItems = initialItems.sort(() => Math.random() - 0.5);
          setOrderItems(initialItems);
       }
    }
  }, [game?.currentQuestionIndex]);

  useEffect(() => {
    if (game && game.status === 'active' && game.currentQuestionIndex >= 0 && !hasSubmitted) {
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
  }, [game?.status, game?.currentQuestionIndex, hasSubmitted]);

  useEffect(() => {
    if (timeLeft === 0 && !hasSubmitted && game?.status === 'active' && game?.currentQuestionIndex >= 0) {
      submitAnswer(selectedAnswers, true);
    }
  // eslint-disable-next-line
  }, [timeLeft]); // Trigger auto-submit when timeLeft hits 0

  const toggleSelection = (idx) => {
    if (hasSubmitted) return;
    const qType = game.questions[game.currentQuestionIndex].type;
    
    if (qType === 'multiple') {
      if (selectedAnswers.includes(idx)) {
         setSelectedAnswers(selectedAnswers.filter(i => i !== idx));
      } else {
         setSelectedAnswers([...selectedAnswers, idx]);
      }
    } else {
      submitAnswer([idx]);
    }
  };

  const submitAnswer = async (answersToSubmit, isAuto = false) => {
    if (hasSubmitted) return;
    setHasSubmitted(true);
    
    const q = game.questions[game.currentQuestionIndex];
    let isCorrect = false;

    if (q.type === 'multiple') {
      isCorrect = q.correctAnswers.length === answersToSubmit.length && 
                  q.correctAnswers.every(v => answersToSubmit.includes(v));
    } else if (q.type === 'order') {
      isCorrect = orderItems.every((item, index) => item.orgIdx === q.correctAnswers[index]);
    } else {
      isCorrect = q.correctAnswers[0] === answersToSubmit[0];
    }

    if (!isAuto && answersToSubmit.length === 0 && q.type !== 'order') {
        isCorrect = false; // No answer provided
    }

    if (isCorrect) {
      const limitMs = q.timeLimit * 1000;
      const startTime = startTimesRef.current[game.currentQuestionIndex] || Date.now();
      const elapsed = Date.now() - startTime;
      const timeRatio = Math.max(0, (limitMs - elapsed) / limitMs);
      const points = Math.round(1000 + (500 * timeRatio));

      await updateDoc(doc(db, `games/${gameCode}/players`, playerId), {
        score: increment(points)
      });
    }

    setFeedback(isCorrect ? 'correct' : 'wrong');
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(orderItems);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setOrderItems(items);
  };

  if (!playerId) return <div className="center-vertical"><h2>Invalid Player State</h2></div>;
  if (!game || !player) return <div className="center-vertical"><h2>Loading...</h2></div>;

  if (game.status === 'waiting') {
    return (
      <div className="center-vertical">
        <h2 className="title animate-pulse">You're in!</h2>
        <p className="subtitle">See your nickname on screen</p>
        <div style={{ padding: '20px', background: '#e0e0e0', borderRadius: '12px', fontSize: '2rem', fontWeight: '900' }}>
          {player.name}
        </div>
      </div>
    );
  }

  if (game.status === 'finished') {
    return (
      <div className="center-vertical" style={{ textAlign: 'center' }}>
        <h1 className="title">Quiz Finished!</h1>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>{player.name}</h2>
        <p style={{ fontSize: '2rem' }}>Final Score: <strong>{Math.round(player.score)}</strong> pts</p>
        <p style={{ marginTop: '30px', fontSize: '1.2rem' }}>Check the big screen for the final podium!</p>
      </div>
    );
  }

  const currentQ = game.questions[game.currentQuestionIndex];

  return (
    <div className="center-vertical" style={{ width: '100%', padding: '20px', justifyContent: 'flex-start' }}>
      
      {feedback && (
        <div className="feedback-screen" style={{ backgroundColor: feedback === 'correct' ? 'var(--color-green)' : 'var(--color-red)' }}>
          {feedback === 'correct' ? <Check size={100} /> : <X size={100} />}
          <h1 style={{fontSize: '4rem', fontFamily: 'Montserrat', marginTop: '20px'}}>
             {feedback === 'correct' ? 'Correct!' : 'Incorrect'}
          </h1>
          <p style={{fontSize: '1.5rem', marginTop: '20px'}}>Waiting for next question...</p>
        </div>
      )}

      {!hasSubmitted && (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          <div style={{display:'flex', justifyContent:'space-between', width:'100%', maxWidth:'1000px', marginBottom: '30px'}}>
              <div style={{background:'white', padding:'10px 20px', borderRadius:'20px', fontWeight:'bold', boxShadow:'0 4px 0px rgba(0,0,0,0.1)'}}>{player.name} | {player.score} pts</div>
              <div className="timer-circle" style={{margin:0, width:'60px', height:'60px', fontSize:'2rem'}}>{timeLeft}</div>
          </div>

          {currentQ.type === 'order' ? (
             <div style={{width: '100%', maxWidth: '600px'}}>
               <p style={{fontSize: '1.5rem', textAlign: 'center', marginBottom: '20px', fontWeight: 'bold'}}>Drag & Drop to Reorder</p>
               <DragDropContext onDragEnd={handleDragEnd}>
                 <Droppable droppableId="droppable-options">
                   {(provided) => (
                     <div {...provided.droppableProps} ref={provided.innerRef}>
                       {orderItems.map((item, index) => (
                         <Draggable key={item.id} draggableId={item.id} index={index}>
                           {(provided) => (
                             <div
                               ref={provided.innerRef}
                               {...provided.draggableProps}
                               {...provided.dragHandleProps}
                               className={`order-item ${COLORS[item.orgIdx % 4]}`}
                               style={{...provided.draggableProps.style, color:'white'}}
                             >
                               {item.image && <img src={item.image} style={{height:'50px', borderRadius:'8px'}} alt=""/>}
                               <span>{item.text}</span>
                             </div>
                           )}
                         </Draggable>
                       ))}
                       {provided.placeholder}
                     </div>
                   )}
                 </Droppable>
               </DragDropContext>
             </div>
          ) : (
            <div className="options-grid">
              {currentQ.options.map((opt, idx) => {
                const Icon = ICONS[idx % 4];
                const isSelected = selectedAnswers.includes(idx);
                return (
                  <button 
                    key={idx} 
                    className={`option-card ${COLORS[idx % 4]} ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleSelection(idx)}
                    style={{ opacity: selectedAnswers.length > 0 && !isSelected && currentQ.type !== 'multiple' ? 0.6 : 1 }}
                  >
                    <Icon className="shape-icon" fill="white" />
                    {opt.image && <img src={opt.image} style={{height:'60px', borderRadius:'8px'}} alt=""/>}
                    <span style={{flex: 1}}>{opt.text}</span>
                  </button>
                )
              })}
            </div>
          )}

          {(currentQ.type === 'multiple' || currentQ.type === 'order') && (
            <button onClick={() => submitAnswer(selectedAnswers, false)} className="btn btn-primary" style={{marginTop: '40px', fontSize: '1.8rem', padding: '15px 50px'}}>
              Submit Answer
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default ParticipantQuiz;
