import React from "react";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  iconLeft?: React.ReactNode;
};

export default function Badge({ iconLeft, className, children, ...props }: BadgeProps) {
  const cls = ["fb-badge", className ?? ""].join(" ").trim();
  return (
    <span className={cls} {...props}>
      {iconLeft ? <span aria-hidden="true">{iconLeft}</span> : null}
      {children}
    </span>
  );
}
