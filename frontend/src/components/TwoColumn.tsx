import React from "react";

/**
 * TwoColumn
 * - Responsive layout: main content + right rail
 * - Mobile: stacks vertically
 * - Desktop: right rail fixed width ~360px
 */
export default function TwoColumn({
  main,
  right,
}: {
  main: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="fb-container">
      <div className="fb-grid">
        <main className="fb-main">{main}</main>
        {right ? <aside className="fb-aside">{right}</aside> : null}
      </div>
    </div>
  );
}
