import React, { useState } from 'react';
import Button from './Button';
import Input from './Input';

type Props = {
  title: string;
  helper?: string;
  balanceHint?: string;
  presets?: number[]; // dollars
  ctaLabel: string;
  ctaTone?: 'primary' | 'ghost';
  onSubmit?: (amountCents: number) => void; // UI only right now
};

export default function ActionPanel({
  title,
  helper,
  balanceHint,
  presets = [25, 50, 100],
  ctaLabel,
  ctaTone = 'primary',
  onSubmit,
}: Props) {
  const [amount, setAmount] = useState('');

  const parsed = Math.max(0, Math.floor(Number(amount.replace(/[^0-9.]/g, '')) * 100)) || 0;

  return (
    <div className="fb-wallet-action">
      <div className="fb-wallet-action__head">
        <div className="fb-wallet-action__title">{title}</div>
        {helper && <div className="fb-wallet-action__helper">{helper}</div>}
      </div>

      <div className="fb-wallet-action__body">
        <div className="fb-wallet-action__field">
          <Input
            placeholder="Enter amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-label={`${title} amount`}
          />
        </div>
        {balanceHint && <div className="fb-wallet-action__hint">{balanceHint}</div>}

        <div className="fb-wallet-action__presets">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              className="fb-btn fb-btn--sm fb-btn--ghost"
              onClick={() => setAmount(String(p))}
            >
              ${p}
            </button>
          ))}
        </div>

        <div className="fb-wallet-action__cta">
          <Button
            type="button"
            size="md"
            className="fb-btn--field"
            variant={ctaTone === 'ghost' ? 'ghost' : undefined}
            onClick={() => onSubmit?.(parsed)}
            disabled={parsed <= 0}
          >
            {ctaLabel.replace('$0', `$${(parsed / 100).toFixed(2)}`)}
          </Button>
        </div>
      </div>
    </div>
  );
}
