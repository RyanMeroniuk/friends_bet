import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/* shared UI primitives */
import Button from '../components/Button';
import Input from '../components/Input';
import { ToastContainer, ToastItem } from '../components/Toast';

/* password strength meter */
import PasswordStrength from '../components/PasswordStrength';
import betLogo from '../resources/bet_logo.png';

type Errors = Partial<Record<'username' | 'email' | 'password' | 'usernameOrEmail', string>>;

export default function AuthPage() {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const pushToast = (text: string, tone: ToastItem['tone'] = 'info') => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setToasts(prev => [...prev, { id, text, tone }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2600);
  };
  const closeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const navigate = useNavigate();
  const { register, login } = useAuth();

  /* refs */
  const usernameRef = useRef<HTMLInputElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const liveRef = useRef<HTMLDivElement | null>(null);
  const errorSurfaceRef = useRef<HTMLDivElement | null>(null);

  /* responsive */
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 860px)').matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 860px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  /* entrance animation */
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const clearForm = () => {
    setUsername('');
    setEmail('');
    setPassword('');
    setMessage(null);
    setErrors({});
  };

  /* validation */
  const [errors, setErrors] = useState<Errors>({});
  const emailRe = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/, []);

  function validate(): Errors {
    const e: Errors = {};
    if (mode === 'register') {
      if (!username.trim()) e.username = 'Username is required';
      else if (username.trim().length < 3) e.username = 'Use at least 3 characters';
      if (!email.trim()) e.email = 'Email is required';
      else if (!emailRe.test(email.trim())) e.email = 'Enter a valid email';
      if (!password) e.password = 'Password is required';
      else if (password.length < 8) e.password = 'Use at least 8 characters';
    } else {
      if (!(username.trim() || email.trim())) e.usernameOrEmail = 'Enter your username or email';
      if (!password) e.password = 'Password is required';
    }
    return e;
  }

  useEffect(() => {
    if (message) setMessage(null);
  }, [username, email, password, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const focusFirstError = (e: Errors) => {
    if (e.username) usernameRef.current?.focus();
    else if (e.usernameOrEmail) usernameRef.current?.focus();
    else if (e.email) emailRef.current?.focus();
    else if (e.password) passwordRef.current?.focus();
    setTimeout(() => errorSurfaceRef.current?.focus(), 0);
  };

  const onSubmit = async () => {
    if (submitting) return;
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      focusFirstError(e);
      const msg = Object.values(e)[0] || 'Please fix the highlighted fields';
      setMessage(String(msg));
      pushToast(String(msg), 'error');
      if (liveRef.current) liveRef.current.textContent = String(msg);
      return;
    }

    setSubmitting(true);
    setMessage(null);
    if (liveRef.current) liveRef.current.textContent = mode === 'register' ? 'Creating account…' : 'Signing in…';

    try {
      if (mode === 'register') {
        await register({ username, email, password });
        pushToast('Account created. Welcome!', 'success');
      } else {
        await login({ usernameOrEmail: username || email, password });
        pushToast('Logged in successfully.', 'success');
      }
      navigate('/dashboard');
    } catch (err: any) {
      const data = err?.response?.data;
      const msg = typeof data === 'string' ? data : 'Operation failed';
      setMessage(msg);
      pushToast(msg, 'error');
      if (liveRef.current) liveRef.current.textContent = String(msg);
      setTimeout(() => errorSurfaceRef.current?.focus(), 0);
    } finally {
      setSubmitting(false);
    }
  };

  /* keyboard polish */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          (target as any).isContentEditable);

      if (typing && e.key === 'Escape' && message) {
        setMessage(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [message]);

  /* autofocus */
  useEffect(() => {
    usernameRef.current?.focus();
  }, [mode]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 16,
        background: 'var(--fb-page-bg, #F7F9FC)',
      }}
    >
      <div
        ref={liveRef}
        aria-live="polite"
        style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)' }}
      />

      <div
        style={{
          width: '100%',
          maxWidth: 980,
          background: 'var(--fb-surface, #fff)',
          border: '1px solid var(--fb-border, #E3E8F2)',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 30px 80px rgba(15,23,42,0.12)',
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          transform: mounted ? 'translateY(0)' : 'translateY(6px)',
          opacity: mounted ? 1 : 0,
          transition: 'opacity 220ms ease, transform 220ms ease',
        }}
      >
        {/* LEFT — Brand / Illustration */}
        <div
          style={{
            padding: 24,
            background: 'var(--fb-accent-1, #f3ecde)',
            borderRight: isMobile ? 'none' : '1px solid var(--fb-border, #E3E8F2)',
            display: 'grid',
            alignContent: 'center',
            justifyItems: 'center',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 24,
              background: '#fff',
              border: '1px solid var(--fb-border, #E3E8F2)',
              display: 'grid',
              placeItems: 'center',
              padding: 12,
              marginBottom: 16,
              transform: mounted ? 'scale(1)' : 'scale(0.98)',
              transition: 'transform 260ms ease',
            }}
            aria-hidden="true"
          >
            <div
              className="fb-brand-badge"
              style={{
                width: '100%',
                height: '100%',
                borderRadius: 'inherit',
              }}
            >
              <img
                src={betLogo}
                alt="BigStu Bets logo"
              />
            </div>
          </div>
          <h1 style={{ margin: '0 0 6px', fontSize: 24, color: 'var(--fb-deep, #1B191A)' }}>
            BigStu Bets
          </h1>
          <p style={{ margin: 0, color: 'var(--fb-muted, #6C7482)' }}>
            Friendly wagers with your crew.
          </p>
        </div>

        {/* RIGHT — Auth Card */}
        <div style={{ padding: 24 }}>
          {/* Tabs */}
          <div
            role="tablist"
            aria-label="Auth mode"
            style={{
              display: 'inline-flex',
              gap: 6,
              padding: 4,
              border: '1px solid var(--fb-border, #E3E8F2)',
              borderRadius: 12,
              background: '#fff',
              marginBottom: 16,
            }}
          >
            <button
              role="tab"
              aria-selected={mode === 'register'}
              className="fb-btn fb-btn--ghost fb-btn--sm"
              onClick={() => {
                setMode('register');
                clearForm();
              }}
              style={{
                borderRadius: 8,
                background: mode === 'register' ? 'var(--fb-accent-1, #f3ecde)' : 'transparent',
              }}
              disabled={submitting}
            >
              Register
            </button>
            <button
              role="tab"
              aria-selected={mode === 'login'}
              className="fb-btn fb-btn--ghost fb-btn--sm"
              onClick={() => {
                setMode('login');
                clearForm();
              }}
              style={{
                borderRadius: 8,
                background: mode === 'login' ? 'var(--fb-accent-1, #f3ecde)' : 'transparent',
              }}
              disabled={submitting}
            >
              Login
            </button>
          </div>

          {/* Headline */}
          <h2 style={{ margin: '0 0 12px', color: 'var(--fb-text, #1B191A)' }}>
            {mode === 'register' ? 'Create your account' : 'Welcome back'}
          </h2>
          <p style={{ margin: '0 0 16px', color: 'var(--fb-muted, #6C7482)', fontSize: 14 }}>
            Use a unique password you’ll remember. Press <kbd>Enter</kbd> to submit.
          </p>

          {/* Error surface */}
          {message && (
            <div
              ref={errorSurfaceRef}
              role="status"
              tabIndex={-1}
              style={{
                border: '1px solid #fecaca',
                background: '#fef2f2',
                color: '#7f1d1d',
                padding: '10px 12px',
                borderRadius: 10,
                marginBottom: 12,
                outline: 'none',
              }}
            >
              {message}
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}
            style={{ display: 'grid', gap: 10 }}
            noValidate
            aria-busy={submitting ? 'true' : 'false'}
          >
            <label className="fb-ff__label" htmlFor="auth-username">
              {mode === 'register' ? 'Username' : 'Username or Email'}
            </label>
            <Input
              id="auth-username"
              placeholder={mode === 'register' ? 'jdoe' : 'jdoe or jdoe@email.com'}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={submitting}
              aria-required="true"
              aria-invalid={Boolean(errors.username || errors.usernameOrEmail)}
              aria-describedby={errors.username || errors.usernameOrEmail ? 'err-username' : undefined}
              ref={usernameRef as any}
            />
            {(errors.username || errors.usernameOrEmail) && (
              <div id="err-username" className="fb-ff__error">
                {errors.username || errors.usernameOrEmail}
              </div>
            )}

            {mode === 'register' && (
              <>
                <label className="fb-ff__label" htmlFor="auth-email">
                  Email
                </label>
                <Input
                  id="auth-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                  aria-required="true"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'err-email' : undefined}
                  ref={emailRef as any}
                />
                {errors.email && (
                  <div id="err-email" className="fb-ff__error">
                    {errors.email}
                  </div>
                )}
              </>
            )}

            <label className="fb-ff__label" htmlFor="auth-password">
              Password
            </label>
            <div style={{ display: 'grid', gap: 6 }}>
              <Input
                id="auth-password"
                type={showPw ? 'text' : 'password'}
                placeholder={mode === 'register' ? 'Create a strong password' : 'Your password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                aria-required="true"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? 'err-password' : undefined}
                ref={passwordRef as any}
              />
              {errors.password && (
                <div id="err-password" className="fb-ff__error">
                  {errors.password}
                </div>
              )}

              {/* Show password */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={showPw}
                    onChange={(e) => setShowPw(e.target.checked)}
                  />
                  Show password
                </label>
              </div>

              {/* Strength meter only on Register */}
              {mode === 'register' && <PasswordStrength value={password} />}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <Button
                type="submit"
                className="fb-btn--field"
                disabled={submitting}
                title={mode === 'register' ? 'Sign up' : 'Log in'}
              >
                {submitting
                  ? (mode === 'register' ? 'Creating…' : 'Signing in…')
                  : mode === 'register' ? 'Sign Up' : 'Log In'}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="fb-btn--field"
                disabled={submitting}
                onClick={() => {
                  clearForm();
                  usernameRef.current?.focus();
                  pushToast('Form cleared', 'info');
                }}
                title="Clear form"
              >
                Clear
              </Button>
            </div>
          </form>
        </div>
      </div>

      <ToastContainer items={toasts} onClose={closeToast} />
    </div>
  );
}
