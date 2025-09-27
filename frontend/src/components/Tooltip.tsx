import React, { useState, useRef } from "react";

/** Minimal tooltip (no portals) */
export default function Tooltip({
  label,
  children,
  side = "top",
}: {
  label: string;
  children: React.ReactNode;
  side?: "top" | "bottom";
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

  return (
    <span
      ref={wrapRef}
      className="fb-tooltip-wrap"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}
      {open ? (
        <span className={`fb-tooltip fb-tooltip--${side}`} role="tooltip">
          {label}
        </span>
      ) : null}
    </span>
  );
}
