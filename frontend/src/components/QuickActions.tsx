import React from "react";
import Button from "./Button";

export default function QuickActions({
  onOpenBets,
  onCopyInvite,
  onNewGroup,
  onJoinGroup,
}: {
  onOpenBets: () => void;
  onCopyInvite: () => void;
  onNewGroup: () => void;
  onJoinGroup: () => void;
}) {
  return (
    <div className="fb-qa">
      <Button type="button" size="md" className="fb-btn--field" onClick={onOpenBets}>
        Open Bets
      </Button>
      <Button type="button" size="md" variant="ghost" className="fb-btn--field" onClick={onCopyInvite}>
        Copy Invite
      </Button>
      <Button type="button" size="md" variant="ghost" className="fb-btn--field" onClick={onNewGroup}>
        New Group
      </Button>
      <Button type="button" size="md" variant="ghost" className="fb-btn--field" onClick={onJoinGroup}>
        Join Group
      </Button>
    </div>
  );
}
