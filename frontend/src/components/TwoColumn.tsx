// src/components/TwoColumn.tsx
import React from 'react';

type Props = {
  main: React.ReactNode;
  right: React.ReactNode;
};

export default function TwoColumn({ main, right }: Props) {
  return (
    <div className="fb-two-col">
      <div className="fb-two-col__inner">
        <main className="fb-two-col__main">{main}</main>
        <aside className="fb-two-col__right">{right}</aside>
      </div>
    </div>
  );
}
