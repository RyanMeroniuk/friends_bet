import React from "react";
import Button from "./Button";

export default function EmptyState({
  title = "Nothing here yet",
  text = "Try creating or joining a group to get started.",
  actionText,
  onAction,
  className,
}: {
  title?: string;
  text?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}) {
  const cls = ["fb-empty", className ?? ""].join(" ").trim();
  return (
    <div className={cls}>
      <h3 className="fb-empty__title">{title}</h3>
      <p className="fb-empty__text">{text}</p>
      {actionText && onAction ? (
        <Button size="sm" variant="ghost" onClick={onAction}>
          {actionText}
        </Button>
      ) : null}
    </div>
  );
}
