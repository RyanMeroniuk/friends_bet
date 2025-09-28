import React from 'react';
import Button from './Button';

type Props = {
  title?: string;
  onRefresh?: () => void;
  rightSlot?: React.ReactNode;
};

export default function WalletHeader({ title = 'Wallet', onRefresh, rightSlot }: Props) {
  return (
    <div className="fb-wallet-header">
      <div className="fb-wallet-header__left">
        <h2 className="fb-wallet-header__title">{title}</h2>
      </div>

      <div className="fb-wallet-header__right">
        {rightSlot}
        {onRefresh && (
          <Button
            type="button"
            size="md"
            variant="ghost"
            className="fb-btn--field"
            onClick={onRefresh}
            title="Refresh balances"
          >
            Refresh
          </Button>
        )}
      </div>
    </div>
  );
}
