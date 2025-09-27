import React from "react";
import SectionCard from "./SectionCard";

export type SportCount = { label: string; count: number };

export default function PopularSportsCard({
  sports = [
    { label: "NBA", count: 0 },
    { label: "NFL", count: 0 },
    { label: "MLB", count: 0 },
    { label: "NHL", count: 0 },
  ],
}: {
  sports?: SportCount[];
}) {
  return (
    <SectionCard title="Popular Sports">
      <div className="fb-kv">
        {sports.map((s) => (
          <div key={s.label} className="fb-kv__row">
            <span className="fb-kv__label">{s.label}</span>
            <span className="fb-kv__value">{s.count} {s.count === 1 ? "group" : "groups"}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
