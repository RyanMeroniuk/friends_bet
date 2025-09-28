import React from 'react';
import Button from './Button';
import Input from './Input';

type Preset = number;

type BaseProps = {
  ctaText: string;
  note?: string;
  presets?: Preset[];
  onSubmit?: (amountCents: number) => void; // optional, UI-only for now
  ctaIcon?: React.ReactNode;
  disabled?: boolean;
  availableLabel?: string; // e.g., "Available: $50.00" (for withdraw card)
};

export default function FundsForm({
  ctaText,
  note,
  presets = [2500, 5000, 10000], // $25, $50, $100 in cents
  onSubmit,
  ctaIcon,
  disabled,
  availableLabel,
}: BaseProps) {
  const [raw, setRaw] = React.useState<string>('');

  function centsDisplay(n: number) {
    return `$${(n / 100).toFixed(0)}`;
  }

  function handlePresetClick(v: number) {
    setRaw(String(v)); // keep as cents in the input for now (UI-only)
  }

  function submit() {
    const cents = parseInt(raw, 10);
    if (!isFinite(cents) || cents <= 0) return;
    onSubmit?.(cents);
  }

  return (
    <div className="fb-funds">
      <div className="fb-funds__row">
        <Input
          placeholder="Amount (cents)"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          aria-label="Amount in cents"
        />
      </div>

      {availableLabel && (
        <div className="fb-funds__avail">{availableLabel}</div>
      )}

      <div className="fb-funds__presets">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            className="fb-chip-btn"
            onClick={() => handlePresetClick(p)}
          >
            {centsDisplay(p)}
          </button>
        ))}
      </div>

      <div className="fb-funds__cta">
        <Button
          type="button"
          size="md"
          className="fb-btn--field"
          onClick={submit}
          disabled={disabled}
          style={{ width: '100%' }}
        >
          {ctaIcon ? <span style={{ display: 'inline-flex', marginRight: 8 }}>{ctaIcon}</span> : null}
          {ctaText}
        </Button>
      </div>

      {note && <div className="fb-funds__note">{note}</div>}
    </div>
  );
}
