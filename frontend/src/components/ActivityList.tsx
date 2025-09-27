import React from "react";
import EmptyState from "./EmptyState";

export type ActivityItem = {
  id: string;
  icon?: React.ReactNode;
  text: string;
  time?: string;
};

export default function ActivityList({
  items,
  loading = false,
}: {
  items: ActivityItem[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="fb-activity">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="fb-activity__row fb-skeleton" />
        ))}
      </div>
    );
  }

  if (!items.length) {
    return <EmptyState title="No recent activity" text="When bets or invites happen, they’ll show up here." />;
  }

  return (
    <div className="fb-activity">
      {items.map(it => (
        <div key={it.id} className="fb-activity__row">
          {it.icon ? <span className="fb-activity__icon">{it.icon}</span> : null}
          <span className="fb-activity__text">{it.text}</span>
          {it.time ? <span className="fb-activity__time">{it.time}</span> : null}
        </div>
      ))}
    </div>
  );
}
