import React from 'react';

export default function TxnListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            border: '1px solid var(--fb-border)',
            background: 'var(--fb-surface)',
            borderRadius: 10,
          }}
        >
          <div style={{ display: 'grid', gap: 6 }}>
            <div className="fb-skeleton" style={{ height: 12, width: 160 }} />
            <div className="fb-skeleton" style={{ height: 10, width: 120 }} />
          </div>
          <div className="fb-skeleton" style={{ height: 16, width: 80, borderRadius: 8 }} />
        </div>
      ))}
    </div>
  );
}
