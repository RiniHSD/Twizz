import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import AdminDashboard from './pages/AdminDashboard';
import HostView from './pages/HostView';
import ParticipantQuiz from './pages/ParticipantQuiz';
import Auth from './pages/Auth';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navigate } from 'react-router-dom';
import './index.css';

function PrivateRoute({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/auth" />;
}

function HeaderButtons() {
  const { currentUser, logout } = useAuth();
  return (
    <div style={{ display: 'flex', gap: '10px' }}>
      {currentUser && (
        <button onClick={logout} className="btn" style={{ fontSize: '1rem', padding: '8px 16px', background: 'transparent', color: '#666' }}>Logout</button>
      )}
      <Link to="/admin" className="btn btn-primary" style={{ fontSize: '1rem', padding: '8px 16px', boxShadow: 'none' }}>
        {currentUser ? 'Dashboard' : 'HSE'}
      </Link>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app-container">
          <header className="header">
            <Link to="/" className="logo">Twizz!</Link>
            <HeaderButtons />
          </header>
          <main className="center-vertical">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
              <Route path="/host/:gameCode" element={<PrivateRoute><HostView /></PrivateRoute>} />
              <Route path="/play/:gameCode" element={<ParticipantQuiz />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
