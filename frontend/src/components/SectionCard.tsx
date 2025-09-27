import React from "react";

type SectionCardProps = {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  padded?: boolean; // allow unpadded if you embed your own spacing
};

export default function SectionCard({
  title,
  subtitle,
  children,
  padded = true,
}: SectionCardProps) {
  return (
    <section className="fb-card">
      {(title || subtitle) && (
        <header className="fb-card-header">
          {title && <h2 className="fb-card-title">{title}</h2>}
          {subtitle && <p className="fb-card-subtitle">{subtitle}</p>}
        </header>
      )}
      <div className={padded ? "fb-card-body" : undefined}>{children}</div>
    </section>
  );
}
