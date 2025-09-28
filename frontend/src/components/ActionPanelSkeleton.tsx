import React from 'react';

export default function ActionPanelSkeleton() {
  return (
    <>
      <div style={panelStyle}>
        <div className="fb-skeleton" style={{ height: 16, width: 120, marginBottom: 8 }} />
        <div className="fb-skeleton" style={{ height: 12, width: 200, marginBottom: 12 }} />
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div className="fb-skeleton" style={pill} />
          <div className="fb-skeleton" style={pill} />
          <div className="fb-skeleton" style={pill} />
        </div>
        <div className="fb-skeleton" style={{ height: 36, width: 140, borderRadius: 10 }} />
      </div>

      <div style={panelStyle}>
        <div className="fb-skeleton" style={{ height: 16, width: 140, marginBottom: 8 }} />
        <div className="fb-skeleton" style={{ height: 12, width: 220, marginBottom: 12 }} />
        <div className="fb-skeleton" style={{ height: 12, width: 160, marginBottom: 12 }} />
        <div className="fb-skeleton" style={{ height: 36, width: 160, borderRadius: 10 }} />
      </div>
    </>
  );
}

const panelStyle: React.CSSProperties = {
  display: 'grid',
  gap: 8,
  padding: '14px 16px',
  border: '1px solid var(--fb-border)',
  borderRadius: 'var(--fb-radius)',
  background: 'var(--fb-surface)',
};

const pill: React.CSSProperties = {
  height: 28,
  width: 56,
  borderRadius: 999,
};
