import React from "react";

export default function Skeleton({
  width = "100%",
  height = 12,
  className,
  style,
}: {
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const cls = ["fb-skeleton", className ?? ""].join(" ").trim();
  const sx: React.CSSProperties = {
    width,
    height,
    ...style,
  };
  return <div className={cls} style={sx} />;
}
