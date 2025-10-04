import React from 'react';

type BetsHeaderProps = {
  onRefreshSports: () => void;
  onSettleAccepted: () => void;
  rightSlot?: React.ReactNode;
  busyRefresh?: boolean;
  busySettle?: boolean;
};

export default function BetsHeader({
  onRefreshSports,
  onSettleAccepted,
  rightSlot,
  busyRefresh,
  busySettle,
}: BetsHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 0',
      }}
    >
      <h2 style={{ margin: 0, fontSize: 20, color: 'var(--fb-text)' }}>Bets</h2>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Keep the two required actions */}
        <button
          className="fb-btn fb-btn--ghost fb-btn--md"
          onClick={onRefreshSports}
          disabled={!!busyRefresh}
          title="Refresh Sports & Games"
        >
          {busyRefresh ? 'Refreshing…' : 'Refresh Sports & Games'}
        </button>
        <button
          className="fb-btn fb-btn--ghost fb-btn--md"
          onClick={onSettleAccepted}
          disabled={!!busySettle}
          title="Settle Accepted Bets"
        >
          {busySettle ? 'Settling…' : 'Settle Accepted Bets'}
        </button>

        {rightSlot}
      </div>
    </div>
  );
}
