import React from "react";
import Skeleton from "./Skeleton";

/** Skeleton rows for the right-rail "Your Groups" list */
export default function GroupListSkeleton({ rows = 6 }: { rows?: number }) {
  const items = Array.from({ length: rows });
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {items.map((_, i) => (
        <li key={i} style={{ marginBottom: 6 }}>
          <div
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: '1px solid var(--fb-border)',
              background: "#ffffff",
            }}
          >
            <Skeleton width="40%" height={14} />
            <Skeleton width="25%" height={12} style={{ marginTop: 6 }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
