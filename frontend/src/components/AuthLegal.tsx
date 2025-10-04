import React from 'react';

export default function AuthLegal({ style }: { style?: React.CSSProperties }) {
  return (
    <div style={{ fontSize: 12, color: 'var(--fb-muted, #6C7482)', ...style }}>
      By continuing, you agree to our{' '}
      <a href="#" onClick={(e) => e.preventDefault()} style={{ color: 'var(--fb-primary, #1B191A)' }}>
        Terms
      </a>{' '}
      and{' '}
      <a href="#" onClick={(e) => e.preventDefault()} style={{ color: 'var(--fb-primary, #1B191A)' }}>
        Privacy Policy
      </a>.
    </div>
  );
}
