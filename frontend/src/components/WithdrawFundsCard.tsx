import React from 'react';
import SectionCard from './SectionCard';
import FundsForm from './FundsForm';

type Props = {
  groupName?: string;
  availableLabel?: string; // e.g., "Available: $50.00"
  onSubmit?: (amountCents: number) => void; // optional, UI-only
};

export default function WithdrawFundsCard({
  groupName = 'Your Group',
  availableLabel = 'Available: $0.00',
  onSubmit,
}: Props) {
  return (
    <SectionCard title="Withdraw Funds">
      <div className="fb-funds__subtitle">
        Transfer money out of <strong>{groupName}</strong>
      </div>

      <FundsForm
        ctaText="Withdraw $0"
        ctaIcon={<span aria-hidden>—</span>}
        availableLabel={availableLabel}
        presets={[2500, 5000, 10000]}
        onSubmit={onSubmit}
      />
    </SectionCard>
  );
}
