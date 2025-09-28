import React from 'react';

export type GroupChip = {
  id: string;
  name: string;
  sportTag?: string;       // e.g., NBA/NFL etc.
  membersCount?: number;   // e.g., 8/12
  winRatePct?: number;     // e.g., 68
  active?: boolean;
  balanceCents?: number;
};

type Props = {
  groups: GroupChip[];
  onSelect: (id: string) => void;
};

export default function GroupScroller({ groups, onSelect }: Props) {
  return (
    <div className="fb-wallet-scroll" role="tablist" aria-label="Select group">
      {groups.map(g => (
        <button
          key={g.id}
          role="tab"
          aria-selected={!!g.active}
          className={`fb-wallet-chip ${g.active ? 'is-active' : ''}`}
          onClick={() => onSelect(g.id)}
          title={g.name}
        >
          <div className="fb-wallet-chip__top">
            <span className="fb-wallet-chip__name">{g.name}</span>
          </div>

          <div className="fb-wallet-chip__balance" aria-label="Wallet balance">
            <span className="fb-wallet-chip__balance-label">Balance</span>
            <span className="fb-wallet-chip__balance-value">
              {typeof g.balanceCents === 'number'
                ? `$${(g.balanceCents / 100).toFixed(2)}`
                : '—'}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
