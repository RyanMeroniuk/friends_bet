import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ToastContainer, ToastItem } from '../components/Toast';
import PasswordStrength from '../components/PasswordStrength';
import '../styles/ui.css';

type Errors = Partial<Record<'username' | 'email' | 'password' | 'usernameOrEmail', string>>;

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toast = (text: string, tone: ToastItem['tone'] = 'info') => {
    const id = crypto.randomUUID();
    setToasts((p) => [...p, { id, text, tone }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3000);
  };

  const navigate = useNavigate();
  const { register, login } = useAuth();
  const usernameRef = useRef<HTMLInputElement>(null);
  const emailRe = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/, []);

  const clearForm = () => {
    setUsername(''); setEmail(''); setPassword('');
    setMessage(null); setErrors({});
  };

  useEffect(() => { setMessage(null); }, [username, email, password, mode]);
  useEffect(() => { usernameRef.current?.focus(); }, [mode]);

  function validate(): Errors {
    const e: Errors = {};
    if (mode === 'register') {
      if (!username.trim()) e.username = 'Username is required';
      else if (username.trim().length < 3) e.username = 'At least 3 characters';
      if (!email.trim()) e.email = 'Email is required';
      else if (!emailRe.test(email.trim())) e.email = 'Enter a valid email';
      if (!password) e.password = 'Password is required';
      else if (password.length < 8) e.password = 'At least 8 characters';
    } else {
      if (!(username.trim() || email.trim())) e.usernameOrEmail = 'Enter your username or email';
      if (!password) e.password = 'Password is required';
    }
    return e;
  }

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (submitting) return;
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      const msg = Object.values(e)[0]!;
      setMessage(msg); toast(msg, 'error');
      return;
    }

    setSubmitting(true); setMessage(null);
    try {
      if (mode === 'register') {
        await register({ username, email, password });
        toast('Account created', 'success');
      } else {
        await login({ usernameOrEmail: username || email, password });
        toast('Logged in', 'success');
      }
      navigate('/dashboard');
    } catch (err: any) {
      const msg = typeof err?.response?.data === 'string' ? err.response.data : 'Something went wrong';
      setMessage(msg); toast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--fb-bg-deep)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      {/* Brand */}
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--fb-text)', margin: 0, letterSpacing: '-0.02em' }}>
          BigStu Bets
        </h1>
        <div style={{ fontSize: 13, color: 'var(--fb-muted)', marginTop: 4 }}>
          Bet with your boys
        </div>
      </div>

      {/* Card */}
      <div className="fb-glass" style={{ width: '100%', maxWidth: 400, padding: 28, borderRadius: 16 }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
          <button
            className={`fb-btn fb-btn--sm ${mode === 'login' ? 'fb-btn--primary' : 'fb-btn--ghost'}`}
            style={{ flex: 1 }}
            onClick={() => { setMode('login'); clearForm(); }}
          >
            Log In
          </button>
          <button
            className={`fb-btn fb-btn--sm ${mode === 'register' ? 'fb-btn--primary' : 'fb-btn--ghost'}`}
            style={{ flex: 1 }}
            onClick={() => { setMode('register'); clearForm(); }}
          >
            Register
          </button>
        </div>

        {/* Error */}
        {message && (
          <div style={{
            padding: '8px 12px', borderRadius: 8, marginBottom: 16,
            background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: 13,
          }}>
            {message}
          </div>
        )}

        {/* Form */}
        <form onSubmit={onSubmit} noValidate style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={{ display: 'block', color: 'var(--fb-text)', fontSize: 13, marginBottom: 4 }}>
              {mode === 'register' ? 'Username' : 'Username or Email'}
            </label>
            <input
              ref={usernameRef}
              className="fb-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={mode === 'register' ? 'jdoe' : 'jdoe or jdoe@email.com'}
              disabled={submitting}
              autoComplete={mode === 'login' ? 'username' : 'off'}
            />
            {(errors.username || errors.usernameOrEmail) && (
              <div style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>
                {errors.username || errors.usernameOrEmail}
              </div>
            )}
          </div>

          {mode === 'register' && (
            <div>
              <label style={{ display: 'block', color: 'var(--fb-text)', fontSize: 13, marginBottom: 4 }}>
                Email
              </label>
              <input
                className="fb-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={submitting}
              />
              {errors.email && (
                <div style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.email}</div>
              )}
            </div>
          )}

          <div>
            <label style={{ display: 'block', color: 'var(--fb-text)', fontSize: 13, marginBottom: 4 }}>
              Password
            </label>
            <input
              className="fb-input"
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'register' ? 'Create a strong password' : 'Your password'}
              disabled={submitting}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
            {errors.password && (
              <div style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.password}</div>
            )}
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12, color: 'var(--fb-muted)', cursor: 'pointer' }}>
              <input type="checkbox" checked={showPw} onChange={(e) => setShowPw(e.target.checked)} />
              Show password
            </label>
            {mode === 'register' && <PasswordStrength value={password} />}
          </div>

          <button
            type="submit"
            className="fb-btn fb-btn--primary fb-btn--md"
            disabled={submitting}
            style={{ width: '100%', marginTop: 4 }}
          >
            {submitting
              ? (mode === 'register' ? 'Creating…' : 'Signing in…')
              : (mode === 'register' ? 'Create Account' : 'Log In')
            }
          </button>
        </form>
      </div>

      <ToastContainer items={toasts} onClose={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
    </div>
  );
}
