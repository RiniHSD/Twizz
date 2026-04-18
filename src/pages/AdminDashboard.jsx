import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, setDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { uploadImage } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Play, Image as ImageIcon, Save, List } from 'lucide-react';

function AdminDashboard() {
  const { currentUser } = useAuth();
  const [view, setView] = useState('list'); // 'list' or 'create'
  const [savedQuizzes, setSavedQuizzes] = useState([]);
  
  const [title, setTitle] = useState('Tuizz Fun Quiz!');
  const [description, setDescription] = useState('Are you ready?');
  const [questions, setQuestions] = useState([
    { type: 'quiz', text: '', image: '', options: [{text:'', image:''}, {text:'', image:''}, {text:'', image:''}, {text:'', image:''}], correctAnswers: [0], timeLimit: 20 }
  ]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (view === 'list' && currentUser) {
      fetchSavedQuizzes();
    }
  }, [view, currentUser]);

  const fetchSavedQuizzes = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'quiz_templates'), where('uid', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      const quizzes = [];
      querySnapshot.forEach((doc) => {
        quizzes.push({ id: doc.id, ...doc.data() });
      });
      // Sort by creation time manually if needed, or rely on firestore rules. Simple sort here.
      quizzes.sort((a, b) => b.createdAt - a.createdAt);
      setSavedQuizzes(quizzes);
    } catch (err) {
      console.error("Error fetching templates:", err);
    }
    setLoading(false);
  };

  const handleStartGameFromTemplate = async (template) => {
    if (loading) return;
    setLoading(true);
    try {
      const gameCode = Math.floor(100000 + Math.random() * 900000).toString();
      const gameData = {
        title: template.title,
        description: template.description,
        status: 'waiting',
        currentQuestionIndex: -1,
        createdAt: Date.now(),
        questions: template.questions
      };
      await setDoc(doc(db, 'games', gameCode), gameData);
      navigate(`/host/${gameCode}`);
    } catch (error) {
      console.error("Error starting game from template:", error);
      alert('Failed to start quiz.');
    }
    setLoading(false);
  };

  const handleAddQuestion = (type) => {
    let newQ = { type, text: '', image: '', correctAnswers: [], timeLimit: 20, options: [] };
    if (type === 'quiz' || type === 'multiple') {
      newQ.options = [{text:'', image:''}, {text:'', image:''}, {text:'', image:''}, {text:'', image:''}];
      newQ.correctAnswers = [0];
    } else if (type === 'boolean') {
      newQ.options = [{text:'True', image:''}, {text:'False', image:''}];
      newQ.correctAnswers = [0];
    } else if (type === 'order') {
      newQ.options = [{text:'Step 1', image:''}, {text:'Step 2', image:''}, {text:'Step 3', image:''}, {text:'Step 4', image:''}];
      newQ.correctAnswers = [0, 1, 2, 3]; 
    }
    setQuestions([...questions, newQ]);
  };

  const handleRemoveQuestion = (idx) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== idx));
    }
  };

  const handleQuestionChange = (idx, field, value) => {
    const updated = [...questions];
    updated[idx][field] = value;
    setQuestions(updated);
  };

  const handleOptionChange = (qIdx, optIdx, field, value) => {
    const updated = [...questions];
    updated[qIdx].options[optIdx][field] = value;
    setQuestions(updated);
  };

  const handleImageUpload = async (file, callback) => {
    if (!file) return;
    setLoading(true);
    try {
      const url = await uploadImage(file, 'image');
      callback(url);
    } catch (err) {
      alert('Failed to upload image.');
    }
    setLoading(false);
  };

  const toggleCorrectAnswer = (qIdx, optIdx) => {
    const updated = [...questions];
    const q = updated[qIdx];
    if (q.type === 'quiz' || q.type === 'boolean') {
      q.correctAnswers = [optIdx];
    } else if (q.type === 'multiple') {
      if (q.correctAnswers.includes(optIdx)) {
        q.correctAnswers = q.correctAnswers.filter(v => v !== optIdx);
      } else {
        q.correctAnswers.push(optIdx);
      }
    }
    setQuestions(updated);
  };

  const handleSaveQuiz = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const templateData = {
        uid: currentUser.uid,
        title,
        description,
        createdAt: Date.now(),
        questions: questions
      };
      await addDoc(collection(db, 'quiz_templates'), templateData);
      alert('Quiz Saved Successfully!');
      setView('list');
    } catch (error) {
      console.error("Error saving template:", error);
      alert('Failed to save quiz. See console.');
    }
    setLoading(false);
  };

  return (
    <div className="card" style={{ maxWidth: '900px', width: '100%', margin: '20px auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '30px' }}>
        <button 
          onClick={() => setView('list')} 
          className={`btn ${view === 'list' ? 'btn-primary' : ''}`}
          style={{ padding: '10px 20px', fontSize: '1.2rem', backgroundColor: view === 'list' ? '' : '#eee', color: view === 'list' ? '' : '#333' }}
        >
          <List size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> My Quizzes
        </button>
        <button 
          onClick={() => setView('create')} 
          className={`btn ${view === 'create' ? 'btn-primary' : ''}`}
          style={{ padding: '10px 20px', fontSize: '1.2rem', backgroundColor: view === 'create' ? '' : '#eee', color: view === 'create' ? '' : '#333' }}
        >
          <Plus size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Create New
        </button>
      </div>

      {view === 'list' ? (
        <div>
          <h2 className="title" style={{ fontSize: '2rem', marginBottom: '20px' }}>My Saved Quizzes</h2>
          {loading && <p>Loading your quizzes...</p>}
          {!loading && savedQuizzes.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f9f9f9', borderRadius: '12px' }}>
              <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '20px' }}>You haven't created any quizzes yet.</p>
              <button onClick={() => setView('create')} className="btn btn-primary" style={{ padding: '10px 30px', fontSize: '1.2rem' }}>
                Create Your First Quiz
              </button>
            </div>
          )}
          <div style={{ display: 'grid', gap: '15px' }}>
            {savedQuizzes.map(quiz => (
              <div key={quiz.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', backgroundColor: '#fff', border: '2px solid #eee', borderRadius: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '5px' }}>{quiz.title}</h3>
                  <p style={{ color: '#666' }}>{quiz.questions.length} questions • Created on {new Date(quiz.createdAt).toLocaleDateString()}</p>
                </div>
                <button onClick={() => handleStartGameFromTemplate(quiz)} className="btn btn-primary" style={{ padding: '10px 25px', fontSize: '1.2rem' }}>
                  <Play size={20} style={{ marginRight: '8px' }} /> Start Game
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSaveQuiz}>
          <h2 className="title" style={{ fontSize: '2rem', marginBottom: '20px' }}>Create Fun Quiz! 🎉</h2>
          <div className="form-group">
            <input type="text" className="input-field" placeholder="Dashboard Title" value={title} onChange={(e) => setTitle(e.target.value)} style={{maxWidth:'100%'}}/>
          </div>

          {questions.map((q, qIdx) => (
            <div key={qIdx} style={{ backgroundColor: '#fff', border: '2px solid #eee', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 4px 0 #eee' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div style={{fontWeight: 'bold', fontSize: '1.2rem'}}>
                  Q{qIdx + 1}: {q.type.toUpperCase()}
                </div>
                <button type="button" onClick={() => handleRemoveQuestion(qIdx)} className="btn btn-red" style={{padding: '5px 10px', fontSize: '1rem'}}><Trash2 size={16}/></button>
              </div>

              {/* Question Text & Image */}
              <div style={{display: 'flex', gap: '10px', marginBottom: '15px'}}>
                <input type="text" placeholder="Question Text..." className="input-field" value={q.text} onChange={(e) => handleQuestionChange(qIdx, 'text', e.target.value)} style={{flex: 1, marginBottom: 0}} required />
                <label className="btn" style={{backgroundColor: '#e0e0e0', color: '#333'}}>
                  <ImageIcon size={20} />
                  <input type="file" accept="image/*" style={{display:'none'}} onChange={(e) => handleImageUpload(e.target.files[0], (url) => handleQuestionChange(qIdx, 'image', url))} />
                </label>
              </div>
              {q.image && <img src={q.image} alt="Q" style={{height:'100px', borderRadius:'8px', objectFit:'cover', marginBottom:'15px'}}/>}

              {/* Options */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                {q.options.map((opt, optIdx) => (
                  <div key={optIdx} style={{ border: q.correctAnswers.includes(optIdx) ? '3px solid var(--color-green)' : '2px solid #ccc', borderRadius: '8px', padding: '10px', position: 'relative' }}>
                    
                    {q.type !== 'order' && (
                      <div style={{ position: 'absolute', top: '-10px', right: '-10px', background: q.correctAnswers.includes(optIdx) ? 'var(--color-green)' : '#ccc', color:'white', borderRadius: '50%', width:'24px', height:'24px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }} onClick={() => toggleCorrectAnswer(qIdx, optIdx)}>
                        {q.correctAnswers.includes(optIdx) ? '✓' : ''}
                      </div>
                    )}

                    {q.type === 'order' && <div style={{fontWeight: 'bold', marginBottom:'5px', color:'var(--color-blue)'}}>Position {optIdx + 1}</div>}

                    <input type="text" placeholder={`Option ${optIdx + 1}`} className="input-field" value={opt.text} onChange={(e) => handleOptionChange(qIdx, optIdx, 'text', e.target.value)} style={{maxWidth:'100%', padding: '8px', fontSize:'1rem'}} required={q.type !== 'boolean'} />
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                       <label className="btn" style={{padding: '5px 10px', fontSize:'0.9rem', backgroundColor: '#e0e0e0', color: '#000'}}>
                          <ImageIcon size={16} style={{marginRight:'5px'}} /> Upload Image
                          <input type="file" accept="image/*" style={{display:'none'}} onChange={(e) => handleImageUpload(e.target.files[0], (url) => handleOptionChange(qIdx, optIdx, 'image', url))} />
                       </label>
                       {opt.image && <img src={opt.image} style={{height:'30px', borderRadius:'4px'}} alt=""/>}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{display:'flex', alignItems:'center'}}>
                  <span style={{marginRight:'10px', fontWeight:'bold'}}>Timer (s):</span>
                  <input type="number" className="input-field" value={q.timeLimit} onChange={(e) => handleQuestionChange(qIdx, 'timeLimit', e.target.value)} style={{width:'80px', marginBottom:0, padding:'5px'}} />
              </div>
            </div>
          ))}

          <div style={{display: 'flex', gap: '10px', marginBottom: '30px', flexWrap: 'wrap'}}>
              <button type="button" onClick={() => handleAddQuestion('quiz')} className="btn btn-blue"><Plus size={18}/> Quiz</button>
              <button type="button" onClick={() => handleAddQuestion('boolean')} className="btn btn-red"><Plus size={18}/> True/False</button>
              <button type="button" onClick={() => handleAddQuestion('multiple')} className="btn btn-yellow"><Plus size={18}/> Checkbox</button>
              <button type="button" onClick={() => handleAddQuestion('order')} className="btn btn-green"><Plus size={18}/> Order</button>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: '1.5rem', padding: '20px' }} disabled={loading}>
            {loading ? 'Processing...' : <><Save size={24} style={{ marginRight: '10px' }} /> Save Quiz Template</>}
          </button>
        </form>
      )}
    </div>
  );
}

export default AdminDashboard;
