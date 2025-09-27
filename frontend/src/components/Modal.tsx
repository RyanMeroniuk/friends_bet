import React, { useEffect } from "react";

export default function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  width = 520,
}: {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
}) {
  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fb-modal__backdrop" role="dialog" aria-modal="true" aria-label={title || "Dialog"}>
      <div className="fb-modal" style={{ maxWidth: width }}>
        <div className="fb-modal__header">
          <h3 className="fb-modal__title">{title}</h3>
          <button type="button" className="fb-modal__close" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="fb-modal__body">
          {children}
        </div>
        {footer ? <div className="fb-modal__footer">{footer}</div> : null}
      </div>
    </div>
  );
}
