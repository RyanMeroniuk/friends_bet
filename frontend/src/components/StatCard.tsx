import React from 'react';

type Props = {
  title: string;
  value: string;
  sub?: string;
  tone?: 'default' | 'success' | 'warning';
};

export default function StatCard({ title, value, sub, tone = 'default' }: Props) {
  return (
    <div className="fb-wallet-stat">
      <div className="fb-wallet-stat__title">{title}</div>
      <div className={`fb-wallet-stat__value fb-wallet-stat__value--${tone}`}>{value}</div>
      {sub && <div className="fb-wallet-stat__sub">{sub}</div>}
    </div>
  );
}
