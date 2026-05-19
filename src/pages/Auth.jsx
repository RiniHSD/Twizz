import React, { useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';

function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let result;
      if (isLogin) {
        result = await supabase.auth.signInWithPassword({ email, password });
      } else {
        result = await supabase.auth.signUp({ email, password });
      }

      if (result.error) {
        throw result.error;
      }

      navigate('/admin'); // Redirect to Admin Dashboard
    } catch (err) {
      console.error("Auth Error:", err);
      let errorMessage = err.message || 'An error occurred. Please try again.';
      setError(errorMessage);
    }
    setLoading(false);
  };

  return (
    <div className="center-vertical" style={{ width: '100%' }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%', margin: '0 auto', textAlign: 'center' }}>
        <h2 className="title" style={{ fontSize: '2rem', marginBottom: '20px' }}>
          {isLogin ? 'Host Login' : 'Create Account'}
        </h2>
        
        {error && (
          <div style={{ backgroundColor: '#ffcccc', color: '#cc0000', padding: '10px', borderRadius: '8px', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
            placeholder="Email Address"
            required
            style={{ margin: 0 }}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            placeholder="Password"
            required
            minLength="6"
            style={{ margin: 0 }}
          />
          
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
            style={{ marginTop: '10px', fontSize: '1.2rem', padding: '15px' }}
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div style={{ marginTop: '20px', color: '#666' }}>
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button 
            onClick={() => setIsLogin(!isLogin)} 
            style={{ background: 'none', border: 'none', color: 'var(--color-blue)', fontWeight: 'bold', cursor: 'pointer', marginLeft: '5px', textDecoration: 'underline' }}
          >
            {isLogin ? 'Register' : 'Login'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Auth;
