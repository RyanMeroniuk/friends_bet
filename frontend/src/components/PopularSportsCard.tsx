import React from "react";
import SectionCard from "./SectionCard";

export default function PopularSportsCard() {
  const sports = [
    "Basketball (NBA)",
    "Baseball (MLB)",
    "Football (NFL)",
    "Hockey (NHL)",
  ];

  return (
    <SectionCard title="Supported Sports">
      <div className="fb-kv">
        {sports.map((s) => (
          <div key={s} className="fb-kv__row">
            <span className="fb-kv__label">{s}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
