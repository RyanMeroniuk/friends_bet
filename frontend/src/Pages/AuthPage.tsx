import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();
  const { register, login } = useAuth();

  const clearForm = () => {
    setUsername('');
    setEmail('');
    setPassword('');
    setMessage(null);
  };

  const onSubmit = async () => {
    setSubmitting(true);
    setMessage(null);
    try {
      if (mode === 'register') {
        await register({ username, email, password });
      } else {
        await login({ usernameOrEmail: username || email, password });
      }
      navigate('/dashboard');
    } catch (err: any) {
      const data = err?.response?.data;
      setMessage(typeof data === 'string' ? data : 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <button
          onClick={() => {
            setMode('register');
            clearForm();
          }}
          style={{ fontWeight: mode === 'register' ? 'bold' : 'normal' }}
          disabled={submitting}
        >
          Register
        </button>
        {' | '}
        <button
          onClick={() => {
            setMode('login');
            clearForm();
          }}
          style={{ fontWeight: mode === 'login' ? 'bold' : 'normal' }}
          disabled={submitting}
        >
          Login
        </button>
      </div>

      <h2 style={{ textAlign: 'center' }}>{mode === 'register' ? 'Register' : 'Login'}</h2>

      <label>{mode === 'register' ? 'Username' : 'Username or Email'}</label>
      <br />
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        disabled={submitting}
      />
      <br />
      <br />

      {mode === 'register' && (
        <>
          <label>Email</label>
          <br />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
          />
          <br />
          <br />
        </>
      )}

      <label>Password</label>
      <br />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={submitting}
      />
      <br />
      <br />

      <button onClick={onSubmit} disabled={submitting}>
        {submitting ? 'Working…' : mode === 'register' ? 'Sign Up' : 'Log In'}
      </button>
      {message && <div style={{ marginTop: '1rem', color: 'red' }}>{message}</div>}
    </div>
  );
}
