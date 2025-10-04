import React from 'react';

type Score = 0 | 1 | 2 | 3;

function scorePassword(pw: string): { score: Score; label: string } {
  let n = 0;
  if (!pw) n = 0;
  else {
    if (pw.length >= 8) n++;
    if (/[A-Z]/.test(pw) || /[0-9]/.test(pw)) n++;
    if (/[^A-Za-z0-9]/.test(pw)) n++;
  }
  const clamped = (n > 3 ? 3 : n) as Score;
  const labels = ['Too short', 'Weak', 'Okay', 'Good'] as const;
  const label = labels[clamped];
  return { score: clamped, label };
}

export default function PasswordStrength({ value }: { value: string }) {
  const { score, label } = scorePassword(value);

  const barBase: React.CSSProperties = {
    height: 6,
    borderRadius: 999,
    background: 'var(--fb-border, #e3e8f2)',
    overflow: 'hidden',
  };

  const fill: React.CSSProperties = {
    height: '100%',
    width: `${(score / 3) * 100}%`,
    background:
      score === 0 ? '#fecaca' :
      score === 1 ? '#fde68a' :
      score === 2 ? '#86efac' :
      '#22c55e',
    transition: 'width 160ms ease',
  };

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div style={barBase}><div style={fill} /></div>
      <div style={{ fontSize: 12, color: 'var(--fb-muted, #6c7482)' }}>{label}</div>
    </div>
  );
}
