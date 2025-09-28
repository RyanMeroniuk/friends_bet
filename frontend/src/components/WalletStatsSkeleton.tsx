import React from 'react';

export default function WalletStatsSkeleton() {
  return (
    <>
      <div style={cardStyle}>
        <div className="fb-skeleton" style={{ height: 14, width: 120, marginBottom: 10 }} />
        <div className="fb-skeleton" style={{ height: 24, width: 100 }} />
        <div className="fb-skeleton" style={{ height: 10, width: 140, marginTop: 10 }} />
      </div>
      <div style={cardStyle}>
        <div className="fb-skeleton" style={{ height: 14, width: 140, marginBottom: 10 }} />
        <div className="fb-skeleton" style={{ height: 24, width: 110 }} />
        <div className="fb-skeleton" style={{ height: 10, width: 160, marginTop: 10 }} />
      </div>
      <div style={cardStyle}>
        <div className="fb-skeleton" style={{ height: 14, width: 120, marginBottom: 10 }} />
        <div className="fb-skeleton" style={{ height: 24, width: 100 }} />
        <div className="fb-skeleton" style={{ height: 10, width: 150, marginTop: 10 }} />
      </div>
    </>
  );
}

const cardStyle: React.CSSProperties = {
  display: 'grid',
  gap: 6,
  padding: '14px 16px',
  border: '1px solid var(--fb-border)',
  borderRadius: 'var(--fb-radius)',
  background: 'var(--fb-surface)',
};
