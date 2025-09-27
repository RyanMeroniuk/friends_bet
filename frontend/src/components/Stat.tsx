import React from "react";

export default function Stat({
  label,
  value,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  className?: string;
}) {
  const cls = ["fb-stat", className ?? ""].join(" ").trim();
  return (
    <span className={cls}>
      <span className="fb-stat__label">{label}</span>
      <span className="fb-stat__value">{value}</span>
    </span>
  );
}
