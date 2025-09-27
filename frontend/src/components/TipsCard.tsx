import React from "react";
import CodePill from "./CodePill";
import Button from "./Button";

export default function TipsCard({
  inviteCode,
  membersCount,
  onCopyInvite,
  onOpenBets,
}: {
  inviteCode: string;
  membersCount: number;
  onCopyInvite: () => void;
  onOpenBets: () => void;
}) {
  const solo = membersCount <= 1;
  return (
    <div className="fb-tips">
      <div className="fb-tips__title">{solo ? "Invite a friend to get started" : "Jump back in"}</div>
      <div className="fb-tips__body">
        {solo ? (
          <>
            <p>Share this code to add your first teammate:</p>
            <CodePill code={inviteCode} onCopy={onCopyInvite} />
          </>
        ) : (
          <>
            <p>Ready to place a wager with your crew?</p>
            <Button type="button" size="md" className="fb-btn--field" onClick={onOpenBets}>
              Open Bets
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
