import React from 'react';

export type GroupChip = {
  id: string;
  name: string;
  sportTag?: string;       // e.g., NBA/NFL etc.
  membersCount?: number;   // e.g., 8/12
  winRatePct?: number;     // e.g., 68
  active?: boolean;
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
            {g.sportTag && <span className="fb-wallet-chip__tag">{g.sportTag}</span>}
          </div>

          <div className="fb-wallet-chip__meta">
            {typeof g.membersCount === 'number' && (
              <span>👥 {g.membersCount}</span>
            )}
            {typeof g.winRatePct === 'number' && (
              <span>↗ {g.winRatePct}%</span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
