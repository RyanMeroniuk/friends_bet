import React from 'react';
import SectionCard from './SectionCard';

export default function WalletSecurityCard() {
  return (
    <SectionCard title="Security reminders">
      <ul className="fb-list">
        <li>Only deposit from accounts you control.</li>
        <li>Double-check amounts before confirming actions.</li>
        <li>Never share your account ID or invite codes publicly.</li>
      </ul>
    </SectionCard>
  );
}
