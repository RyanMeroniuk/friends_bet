import React from "react";
import Button from "./Button";

export default function CodePill({
  code,
  onCopy,
}: {
  code: string;
  onCopy?: () => void;
}) {
  return (
    <div className="fb-pill">
      <code className="fb-pill__code">{code}</code>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="fb-pill__btn fb-btn--field"
        onClick={onCopy}
        title="Copy invite code"
      >
        Copy
      </Button>
    </div>
  );
}
