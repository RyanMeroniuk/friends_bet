import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
  size?: "sm" | "md" | "lg";
};

export default function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  const cls = [
    "fb-btn",
    `fb-btn--${variant}`,
    `fb-btn--${size}`,
    className ?? ""
  ].join(" ").trim();

  return <button {...props} className={cls} />;
}
