import React from 'react';
import Button from './Button';

type Props = {
  onGoogle?: () => void;
  onApple?: () => void;
};

export default function SocialAuthButtons({ onGoogle, onApple }: Props) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ color: 'var(--fb-muted, #6C7482)', fontSize: 12 }}>
        Or continue with
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Button variant="ghost" className="fb-btn--field" onClick={onGoogle}>
          {/* simple icon dot */}
          <span
            aria-hidden
            style={{
              width: 8, height: 8, borderRadius: 999, background: '#4285F4',
            }}
          />
          Google
        </Button>
        <Button variant="ghost" className="fb-btn--field" onClick={onApple}>
          <span
            aria-hidden
            style={{
              width: 8, height: 8, borderRadius: 2, background: '#111',
            }}
          />
          Apple
        </Button>
      </div>
    </div>
  );
}
