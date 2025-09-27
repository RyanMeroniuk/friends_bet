import React from "react";
import Skeleton from "./Skeleton";

/** A simple skeleton grid for group cards */
export default function GroupsGridSkeleton({ count = 6 }: { count?: number }) {
  const items = Array.from({ length: count });
  return (
    <div className="fb-groups-grid">
      {items.map((_, i) => (
        <div key={i} className="fb-group-card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <Skeleton width="60%" height={16} />
            <Skeleton width={60} height={22} />
          </div>
          <div style={{ marginTop: 10 }}>
            <Skeleton height={12} style={{ marginBottom: 6 }} />
            <Skeleton height={12} style={{ width: "75%" }} />
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
            <Skeleton width={80} height={14} />
            <Skeleton width={60} height={14} />
          </div>
          <div style={{ marginTop: 12 }}>
            <Skeleton width="50%" height={12} />
          </div>
        </div>
      ))}
    </div>
  );
}
