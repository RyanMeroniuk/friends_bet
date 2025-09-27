import React from "react";
import GroupCard, { GroupCardProps } from "./GroupCard";

/**
 * GroupsGrid
 * - Responsive grid of GroupCard
 * - Passes through click and open handlers
 */
export default function GroupsGrid({
  groups,
  onSelect,
  onOpen,
}: {
  groups: GroupCardProps[];
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  if (!groups || groups.length === 0) {
    return <div>No groups to display.</div>;
  }

  return (
    <div className="fb-groups-grid">
      {groups.map((g) => (
        <GroupCard
          key={g.id}
          {...g}
          onClick={onSelect}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}
