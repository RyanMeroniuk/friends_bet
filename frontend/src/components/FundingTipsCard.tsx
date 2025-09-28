import React from 'react';
import SectionCard from './SectionCard';

export default function FundingTipsCard() {
  return (
    <SectionCard title="Funding tips">
      <ul className="fb-list">
        <li>Use quick presets for common deposit amounts.</li>
        <li>Keep a small buffer in Available to place bets faster.</li>
        <li>Pending reflects money tied up in active bets.</li>
      </ul>
    </SectionCard>
  );
}
