import React from "react";

export default function Alert({
  tone = "success",
  children,
}: {
  tone?: "success" | "error" | "info";
  children: React.ReactNode;
}) {
  const map = {
    success: { bg: "#ecfdf5", bd: "#a7f3d0", fg: "#065f46" },
    error:   { bg: "#fef2f2", bd: "#fecaca", fg: "#7f1d1d" },
    info:    { bg: "#eff6ff", bd: "#bfdbfe", fg: "#1e3a8a" },
  }[tone];
  return (
    <div
      style={{
        background: map.bg,
        border: '1px solid var(--fb-border)',
        color: map.fg,
        borderRadius: 10,
        padding: "8px 10px",
        fontSize: 14,
      }}
    >
      {children}
    </div>
  );
}
