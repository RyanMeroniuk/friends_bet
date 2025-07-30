import React, { useState } from 'react';
import { registerUser, loginUser, AuthResponse } from '../api/user';

export default function AuthPage() {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage]   = useState<string | null>(null);
  const [userId, setUserId]     = useState<string | null>(null);

  const clearForm = () => {
    setUsername('');
    setEmail('');
    setPassword('');
    setMessage(null);
    setUserId(null);
  };

  const onSubmit = async () => {
    try {
      let resp: AuthResponse;
      if (mode === 'register') {
        resp = await registerUser({ username, email, password });
      } else {
        resp = await loginUser({ usernameOrEmail: username || email, password });
      }
      // Store token and userId
      localStorage.setItem('token', resp.token);
      localStorage.setItem('userId', resp.id)
      setUserId(resp.id);
      setMessage(`Success! Welcome, ${resp.username}`);
    } catch (err: any) {
      setMessage(err.response?.data || 'Operation failed');
      setUserId(null);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto' }}>
      <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
        <button
          onClick={() => { setMode('register'); clearForm(); }}
          style={{ fontWeight: mode === 'register' ? 'bold' : 'normal' }}
        >
          Register
        </button>
        {' | '}
        <button
          onClick={() => { setMode('login'); clearForm(); }}
          style={{ fontWeight: mode === 'login' ? 'bold' : 'normal' }}
        >
          Login
        </button>
      </div>

      <h2 style={{ textAlign: 'center' }}>
        {mode === 'register' ? 'Register' : 'Login'}
      </h2>

      <label>{mode === 'register' ? 'Username' : 'Username or Email'}</label><br/>
      <input
        value={username}
        onChange={e => setUsername(e.target.value)}
      /><br/><br/>

      {mode === 'register' && (
        <>
          <label>Email</label><br/>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          /><br/><br/>
        </>
      )}

      <label>Password</label><br/>
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
      /><br/><br/>

      <button onClick={onSubmit}>
        {mode === 'register' ? 'Sign Up' : 'Log In'}
      </button>

      {message && (
        <div
          style={{
            marginTop: '1rem',
            color: message.startsWith('Success') ? 'green' : 'red'
          }}
        >
          {message}
        </div>
      )}

      {userId && (
        <p style={{ marginTop: '0.5rem' }}>
          Your User ID is: <strong>{userId}</strong>
        </p>
      )}
    </div>
  );
}
