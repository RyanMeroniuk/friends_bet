import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/* shared UI primitives */
import Button from '../components/Button';
import Input from '../components/Input';
import { ToastContainer, ToastItem } from '../components/Toast';

/* password strength meter */
import PasswordStrength from '../components/PasswordStrength';

/* styles */
import '../styles/auth.css';

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

  /* random bar heights for footer visualizer */
  const barHeights = useMemo(() =>
    Array.from({ length: 8 }, () => Math.floor(Math.random() * 12) + 4), []
  );

  return (
    <main className="fb-auth">
      {/* SVG grain filter for football halftone effect */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <filter id="fb-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feComposite in="SourceGraphic" operator="in" />
          <feBlend in="SourceGraphic" mode="multiply" />
        </filter>
      </svg>

      {/* Animated dot field background */}
      <div className="fb-auth__stars" />

      {/* Corner frame accents */}
      <div className="fb-auth__corner fb-auth__corner--tl" />
      <div className="fb-auth__corner fb-auth__corner--tr" />
      <div className="fb-auth__corner fb-auth__corner--bl" />
      <div className="fb-auth__corner fb-auth__corner--br" />

      {/* Top header */}
      <header className="fb-auth__header">
        <div className="fb-auth__brand">
          <div className="fb-auth__brand-name">BIGSTU</div>
          <div className="fb-auth__brand-sep" />
          <span className="fb-auth__brand-est">EST. 2025</span>
        </div>
        <div className="fb-auth__coords">
          <span>SYS.ONLINE</span>
          <div className="fb-auth__coords-dot" />
          <span>V1.0.0</span>
        </div>
      </header>

      {/* A11y live region */}
      <div
        ref={liveRef}
        aria-live="polite"
        style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)' }}
      />

      {/* Main content */}
      <div className={`fb-auth__content ${mounted ? 'fb-auth__content--mounted' : ''}`}>

        {/* Left — Football animation */}
        <div className="fb-auth__hero">
          <div className="fb-auth__football-wrap">
            {/* Geometric elements */}
            <div className="fb-auth__crosshair fb-auth__crosshair--h" />
            <div className="fb-auth__crosshair fb-auth__crosshair--v" />
            <div className="fb-auth__orbit" />
            <div className="fb-auth__orbit fb-auth__orbit--2" />
            <div className="fb-auth__orbit fb-auth__orbit--3" />
            <div className="fb-auth__marker fb-auth__marker--tl">
              <div className="fb-auth__marker-dot" />
            </div>
            <div className="fb-auth__marker fb-auth__marker--br">
              <div className="fb-auth__marker-dot" />
            </div>
            {/* Football */}
            <div className="fb-auth__football" aria-hidden="true">🏈</div>
          </div>
        </div>

        {/* Right — Form */}
        <div className="fb-auth__form-area">
          {/* Decorative line */}
          <div className="fb-auth__deco-line">
            <div className="fb-auth__deco-line-bar fb-auth__deco-line-bar--short" />
            <span className="fb-auth__deco-sym">&#8734;</span>
            <div className="fb-auth__deco-line-bar fb-auth__deco-line-bar--grow" />
          </div>

          {/* Title */}
          <h1 className="fb-auth__title">
            PLACE YOUR BETS
          </h1>

          {/* Dot pattern */}
          <div className="fb-auth__dots">
            {Array.from({ length: 40 }).map((_, i) => (
              <div key={i} className="fb-auth__dot" />
            ))}
          </div>

          {/* Glass form card */}
          <div className="fb-auth__card">
            {/* Tabs */}
            <div className="fb-auth__tabs" role="tablist" aria-label="Auth mode">
              <button
                role="tab"
                aria-selected={mode === 'register'}
                className={`fb-auth__tab ${mode === 'register' ? 'fb-auth__tab--active' : ''}`}
                onClick={() => { setMode('register'); clearForm(); }}
                disabled={submitting}
              >
                Register
              </button>
              <button
                role="tab"
                aria-selected={mode === 'login'}
                className={`fb-auth__tab ${mode === 'login' ? 'fb-auth__tab--active' : ''}`}
                onClick={() => { setMode('login'); clearForm(); }}
                disabled={submitting}
              >
                Login
              </button>
            </div>

            {/* Card heading */}
            <h2 className="fb-auth__card-title">
              {mode === 'register' ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="fb-auth__card-sub">
              {mode === 'register'
                ? 'Pick a username and strong password to get started.'
                : <>Enter your credentials. Press <kbd>Enter</kbd> to submit.</>
              }
            </p>

            {/* Error surface */}
            {message && (
              <div
                ref={errorSurfaceRef}
                role="status"
                tabIndex={-1}
                className="fb-auth__error"
                style={{ marginBottom: 12 }}
              >
                {message}
              </div>
            )}

            {/* Form */}
            <form
              onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
              className="fb-auth__form"
              noValidate
              aria-busy={submitting ? 'true' : 'false'}
            >
              <label className="fb-auth__label" htmlFor="auth-username">
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

              {/* Email — collapses smoothly when switching to login */}
              <div className={`fb-auth__collapse ${mode !== 'register' ? 'fb-auth__collapse--hidden' : ''}`}>
                <div className="fb-auth__collapse-inner">
                  <label className="fb-auth__label" htmlFor="auth-email">
                    Email
                  </label>
                  <Input
                    id="auth-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting || mode !== 'register'}
                    tabIndex={mode !== 'register' ? -1 : undefined}
                    aria-required={mode === 'register' ? 'true' : undefined}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'err-email' : undefined}
                    ref={emailRef as any}
                  />
                  {errors.email && (
                    <div id="err-email" className="fb-ff__error">
                      {errors.email}
                    </div>
                  )}
                </div>
              </div>

              <label className="fb-auth__label" htmlFor="auth-password">
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

                <div className="fb-auth__pw-extras">
                  <label className="fb-auth__show-pw">
                    <input
                      type="checkbox"
                      checked={showPw}
                      onChange={(e) => setShowPw(e.target.checked)}
                    />
                    Show password
                  </label>
                </div>

                <div className={`fb-auth__collapse ${mode !== 'register' ? 'fb-auth__collapse--hidden' : ''}`}>
                  <div className="fb-auth__collapse-inner">
                    <PasswordStrength value={password} />
                  </div>
                </div>
              </div>

              <div className="fb-auth__actions">
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

          {/* Bottom decorative notation */}
          <div className="fb-auth__bottom-deco">
            <span className="fb-auth__deco-sym">&#8734;</span>
            <div className="fb-auth__deco-line-bar fb-auth__deco-line-bar--grow" />
            <span style={{ fontSize: 9, letterSpacing: '0.1em' }}>BIGSTU.PROTOCOL</span>
          </div>
        </div>
      </div>

      {/* Bottom footer */}
      <footer className="fb-auth__footer">
        <div className="fb-auth__footer-left">
          <span>SYSTEM.ACTIVE</span>
          <div className="fb-auth__footer-bars">
            {barHeights.map((h, i) => (
              <div key={i} className="fb-auth__footer-bar" style={{ height: h }} />
            ))}
          </div>
          <span>V1.0.0</span>
        </div>
        <div className="fb-auth__footer-right">
          <span>RENDERING</span>
          <div className="fb-auth__footer-pulse">
            <div className="fb-auth__footer-pulse-dot" />
            <div className="fb-auth__footer-pulse-dot" />
            <div className="fb-auth__footer-pulse-dot" />
          </div>
          <span>FRAME: &#8734;</span>
        </div>
      </footer>

      <ToastContainer items={toasts} onClose={closeToast} />
    </main>
  );
}
