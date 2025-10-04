import React from 'react';

type Props = {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  /** When present, shows an error state + message below the field */
  error?: string | null;
  /** When no error, shows helper copy below the field */
  helper?: string | null;
  disabled?: boolean;
  /** Optional right-side adornment (e.g., password eye toggle) */
  endAdornment?: React.ReactNode;
  /** Input element id (for accessibility); if omitted one is auto-generated */
  id?: string;
};

export default function AuthField({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  error,
  helper,
  disabled,
  endAdornment,
  id,
}: Props) {
  const inputId = React.useId();
  const finalId = id || inputId;
  const describedBy = error ? `${finalId}-err` : helper ? `${finalId}-help` : undefined;

  const wrapper: React.CSSProperties = {
    display: 'grid',
    gap: 6,
    position: 'relative',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: endAdornment ? '12px 40px 12px 12px' : '12px 12px',
    borderRadius: 10,
    border: `1px solid ${error ? '#fecaca' : 'var(--fb-border, #e3e8f2)'}`,
    background: 'var(--fb-bg-input, #fff)',
    fontSize: 14,
    outline: 'none',
    boxShadow: 'none',
  };

  const adornStyle: React.CSSProperties = {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
    minWidth: 28,
    borderRadius: 8,
    border: '1px solid var(--fb-border, #e3e8f2)',
    background: '#fff',
    cursor: 'pointer',
    userSelect: 'none',
  };

  return (
    <div style={wrapper}>
      <label
        htmlFor={finalId}
        className="fb-ff__label"
        style={{ fontSize: 13, color: 'var(--fb-muted, #6c7482)' }}
      >
        {label}
      </label>

      <input
        id={finalId}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        style={inputStyle}
      />

      {endAdornment && <div style={adornStyle}>{endAdornment}</div>}

      {error ? (
        <div
          id={`${finalId}-err`}
          className="fb-ff__error"
          style={{ color: '#b91c1c', fontSize: 12 }}
        >
          {error}
        </div>
      ) : helper ? (
        <div
          id={`${finalId}-help`}
          className="fb-ff__helper"
          style={{ color: 'var(--fb-muted, #6c7482)', fontSize: 12 }}
        >
          {helper}
        </div>
      ) : null}
    </div>
  );
}
