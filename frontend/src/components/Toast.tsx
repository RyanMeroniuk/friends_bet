import React from "react";

export type ToastItem = {
  id: string;
  text: string;
  tone?: "success" | "error" | "info";
};

export function ToastContainer({ items, onClose }: {
  items: ToastItem[];
  onClose: (id: string) => void;
}) {
  if (!items || items.length === 0) return null;
  return (
    <div className="fb-toast-wrap" role="status" aria-live="polite">
      {items.map(t => (
        <div key={t.id} className={`fb-toast fb-toast--${t.tone ?? "info"}`}>
          <span>{t.text}</span>
          <button
            type="button"
            className="fb-toast__close"
            aria-label="Dismiss"
            onClick={() => onClose(t.id)}
            title="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
