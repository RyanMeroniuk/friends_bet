import React from "react";

function initials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export default function Avatar({
  name,
  size = 28,
}: {
  name?: string;
  size?: number;
}) {
  const label = name ? `Avatar for ${name}` : "Avatar";
  return (
    <div
      className="fb-avatar"
      aria-label={label}
      title={name}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.floor(size * 0.42)) }}
    >
      {initials(name)}
    </div>
  );
}
