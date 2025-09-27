import React from "react";
import Badge from "./Badge";
import Stat from "./Stat";

/**
 * GroupCard
 * - Pure presentational card for a group
 * - Entire card is clickable (button element for a11y)
 * - No data fetching, no side effects
 */
export type GroupCardProps = {
  id: string;
  name: string;
  description?: string;
  sportTag?: string;
  membersCount?: number;
  winRatePct?: number;       // optional, can be undefined
  nextEventSummary?: string; // optional, can be undefined
  active?: boolean;          // highlight when selected
  onClick?: (id: string) => void;             // select/view
  onOpen?: (id: string) => void;              // navigate/open
};

export default function GroupCard({
  id,
  name,
  description,
  sportTag,
  membersCount,
  winRatePct,
  nextEventSummary,
  active = false,
  onClick,
  onOpen,
}: GroupCardProps) {
  return (
    <button
      type="button"
      className={`fb-group-card ${active ? "is-active" : ""}`}
      onClick={() => onClick?.(id)}
      onDoubleClick={() => onOpen?.(id)}
    >
      <div className="fb-group-card__head">
        <h3 className="fb-group-card__title" title={name}>{name}</h3>
        {sportTag ? <Badge>{sportTag}</Badge> : null}
      </div>

      {description ? (
        <p className="fb-group-card__desc" title={description}>{description}</p>
      ) : null}

      <div className="fb-group-card__stats">
        <Stat label="Members" value={typeof membersCount === "number" ? membersCount : "—"} />
        <Stat label="Wins" value={typeof winRatePct === "number" ? `${winRatePct}%` : "—"} />
      </div>

      <div className="fb-group-card__foot">
        <span className="fb-group-card__next">
          {nextEventSummary ? `Next: ${nextEventSummary}` : "Next: —"}
        </span>
      </div>
    </button>
  );
}
