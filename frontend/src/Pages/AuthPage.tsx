import React, { useState } from 'react';
import { registerUser, loginUser } from '../api/user';
import { AuthResponse, CreateUserRequest, LoginRequest } from '../api/user';

export default function AuthPage() {
  // “mode” controls whether we show register or login
  const [mode, setMode] = useState<'register' | 'login'>('register');
  // Shared state
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage]   = useState<string | null>(null);

  const clearForm = () => {
    setUsername('');
    setEmail('');
    setPassword('');
    setMessage(null);
  };

  const onSubmit = async () => {
    try {
      let resp: AuthResponse;
      if (mode === 'register') {
        const req: CreateUserRequest = { username, email, password };
        resp = await registerUser(req);
      } else {
        const req: LoginRequest = { usernameOrEmail: username || email, password };
        resp = await loginUser(req);
      }
      setMessage(`Success! Welcome, ${resp.username}`);
      // Optionally store resp.token...
    } catch (err: any) {
      setMessage(err.response?.data || 'Operation failed');
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
    </div>
  );
}
