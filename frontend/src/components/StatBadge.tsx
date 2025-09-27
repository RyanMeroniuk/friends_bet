import React from "react";

export default function StatBadge({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="fb-stat">
      <div className="fb-stat__value">{value}</div>
      <div className="fb-stat__label">{label}</div>
    </div>
  );
}
