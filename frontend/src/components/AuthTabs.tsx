import React from 'react';

type Mode = 'register' | 'login';

type Props = {
  mode: Mode;
  onChange: (next: Mode) => void;
  disabled?: boolean;
};

/**
 * Segmented control for switching between Sign In / Sign Up.
 * Pure UI; no auth logic.
 */
export default function AuthTabs({ mode, onChange, disabled }: Props) {
  const base: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 0,
    background: 'var(--fb-page-bg, #f5f7fb)',
    border: '1px solid var(--fb-border, #e3e8f2)',
    borderRadius: 999,
    padding: 4,
  };

  const btn = (active: boolean): React.CSSProperties => ({
    appearance: 'none',
    border: 0,
    borderRadius: 999,
    padding: '10px 14px',
    fontWeight: 600,
    fontSize: 14,
    cursor: disabled ? 'default' : 'pointer',
    background: active ? 'var(--fb-surface, #fff)' : 'transparent',
    color: 'var(--fb-text, #0f172a)',
    boxShadow: active ? '0 1px 0 rgba(16,24,40,0.06)' : 'none',
  });

  return (
    <div style={base} role="tablist" aria-label="Authentication mode">
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'login'}
        style={btn(mode === 'login')}
        disabled={disabled}
        onClick={() => onChange('login')}
      >
        Sign In
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'register'}
        style={btn(mode === 'register')}
        disabled={disabled}
        onClick={() => onChange('register')}
      >
        Sign Up
      </button>
    </div>
  );
}
