import React from 'react';
import SectionCard from './SectionCard';
import FundsForm from './FundsForm';

type Props = {
  groupName?: string;
  onSubmit?: (amountCents: number) => void; // optional, UI-only
};

export default function AddFundsCard({ groupName = 'Your Group', onSubmit }: Props) {
  return (
    <SectionCard title="Add Funds">
      <div className="fb-funds__subtitle">
        Deposit money to <strong>{groupName}</strong>
      </div>

      <FundsForm
        ctaText="Deposit $0"
        ctaIcon={<span aria-hidden>＋</span>}
        note="Deposits are instant and reflected immediately in your wallet balance."
        onSubmit={onSubmit}
      />
    </SectionCard>
  );
}
