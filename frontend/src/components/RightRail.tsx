import React from "react";

/**
 * RightRail
 * - Stacks small cards with consistent vertical spacing
 * - Use for Join form, tips, etc.
 */
export default function RightRail({ children }: { children: React.ReactNode }) {
  return <div className="fb-rail">{children}</div>;
}
