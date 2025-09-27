import React from "react";
import Input from "./Input";
import Select from "./Select";
import Badge from "./Badge";
import Button from "./Button";

export default function GroupsHeader({
  title = "Your Groups",
  subtitle = "Select a group to view its members.",
  totalGroups,
  search,
  onSearchChange,
  filter,
  onFilterChange,
  rightSlot,
  searchRef, // NEW
}: {
  title?: string;
  subtitle?: string;
  totalGroups?: number;
  search: string;
  onSearchChange: (val: string) => void;
  filter: string;
  onFilterChange: (val: string) => void;
  rightSlot?: React.ReactNode;
  searchRef?: React.Ref<HTMLInputElement>; // NEW
}) {
  return (
    <div className="fb-header">
      <div className="fb-header__top">
        <div className="fb-header__titles">
          <h1 className="fb-page-title">{title}</h1>
          <p className="fb-page-subtitle">{subtitle}</p>
        </div>
        {rightSlot ? <div className="fb-header__right">{rightSlot}</div> : null}
      </div>

      <div className="fb-header__controls">
        <div className="fb-header__search">
          <div className="fb-input-group">
            <Input
              ref={searchRef as any}
              placeholder="Search your groups…"
              aria-label="Search groups"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {search ? (
              <Button
                variant="ghost"
                size="md"
                className="fb-btn--field"
                type="button"
                onClick={() => onSearchChange("")}
                aria-label="Clear search"
                title="Clear search"
              >
                Clear
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="md"
                className="fb-btn--field"
                type="button"
                disabled
                aria-hidden="true"
                style={{ opacity: 0.5 }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        <div className="fb-header__filter">
          <Select
            aria-label="Filter groups"
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
          >
            <option value="all">All</option>
          </Select>
        </div>

        {typeof totalGroups === "number" ? (
          <Badge aria-label="Total groups">
            {totalGroups} {totalGroups === 1 ? "group" : "groups"}
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
