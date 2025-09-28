import React from 'react';

export type Txn = {
  id: string;
  date: string;          // ISO or human-readable
  description: string;   // e.g., "Deposit", "Withdrawal", "Bet on Knicks -3.5"
  amount: string;        // preformatted, e.g., "$25.00" (UI-only)
  type: 'deposit' | 'withdrawal' | 'bet' | 'payout';
  status: 'completed' | 'pending' | 'failed';
};

type Props = {
  items: Txn[];
  loading?: boolean;
  emptyText?: string;
};

function StatusBadge({ status }: { status: Txn['status'] }) {
  const tone = (() => {
    switch (status) {
      case 'completed':
        return { border: '#a7f3d0', bg: '#ecfdf5', color: '#065f46', label: 'Completed' };
      case 'pending':
        return { border: '#fde68a', bg: '#fffbeb', color: '#92400e', label: 'Pending' };
      case 'failed':
        return { border: '#fecaca', bg: '#fef2f2', color: '#7f1d1d', label: 'Failed' };
      default:
        return { border: 'var(--fb-border)', bg: '#fff', color: 'var(--fb-text)', label: status };
    }
  })();

  return (
    <span
      className="fb-badge"
      style={{
        borderColor: tone.border,
        background: tone.bg,
        color: tone.color,
        fontWeight: 700,
        padding: '3px 8px',
      }}
    >
      {tone.label}
    </span>
  );
}

export default function TransactionsList({ items, loading, emptyText }: Props) {
  if (loading) {
    return (
      <div style={{ display: 'grid', gap: 8 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="fb-skeleton"
            style={{
              height: 44,
              borderRadius: 10,
              background: 'linear-gradient(90deg,#f4f6f8 25%,#eef1f5 37%,#f4f6f8 63%)',
              backgroundSize: '400% 100%',
              animation: 'fb-shimmer 1.1s infinite linear',
            }}
          />
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div style={{ color: 'var(--fb-muted)', padding: '6px 2px' }}>
        {emptyText ?? 'No recent activity.'}
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {/* Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '140px 1fr 140px 120px',
          gap: 10,
          padding: '8px 10px',
          border: '1px solid var(--fb-border)',
          background: 'var(--fb-surface)',
          borderRadius: 10,
          fontWeight: 700,
          color: 'var(--fb-text)',
        }}
      >
        <div>Date</div>
        <div>Description</div>
        <div style={{ textAlign: 'right' }}>Amount</div>
        <div>Status</div>
      </div>

      {/* Rows */}
      {items.map((t) => (
        <div
          key={t.id}
          style={{
            display: 'grid',
            gridTemplateColumns: '140px 1fr 140px 120px',
            gap: 10,
            alignItems: 'center',
            padding: '10px',
            border: '1px solid var(--fb-border)',
            background: '#fff',
            borderRadius: 10,
          }}
        >
          <div style={{ color: 'var(--fb-muted)', fontSize: 13 }}>{t.date}</div>
          <div style={{ color: 'var(--fb-text)', fontWeight: 600 }}>{t.description}</div>
          <div style={{ textAlign: 'right', fontWeight: 700 }}>
            {t.amount}
          </div>
          <div>
            <StatusBadge status={t.status} />
          </div>
        </div>
      ))}
    </div>
  );
}
