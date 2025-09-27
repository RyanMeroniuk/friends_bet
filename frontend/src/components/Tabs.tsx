import React from "react";

type TabKey = string;

export default function Tabs({
  value,
  onChange,
  tabs,
  className,
}: {
  value: TabKey;
  onChange: (key: TabKey) => void;
  tabs: { key: TabKey; label: string }[];
  className?: string;
}) {
  return (
    <div className={`fb-tabs ${className ?? ""}`}>
      <div className="fb-tabs__list" role="tablist" aria-label="Group sections">
        {tabs.map(t => {
          const active = t.key === value;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              className={`fb-tabs__tab ${active ? "is-active" : ""}`}
              onClick={() => onChange(t.key)}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
