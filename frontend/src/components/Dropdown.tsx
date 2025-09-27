import React, { useEffect, useRef, useState } from "react";

export type DropdownItem = {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
};

export default function Dropdown({
  trigger,
  items,
  align = "right",
}: {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="fb-dd" ref={wrapRef}>
      <div onClick={() => setOpen(v => !v)} aria-haspopup="menu" aria-expanded={open}>
        {trigger}
      </div>
      {open && (
        <div
          className={`fb-dd__menu ${align === "left" ? "fb-dd__menu--left" : "fb-dd__menu--right"}`}
          role="menu"
        >
          {items.map((it, i) => (
            <button
              key={i}
              className="fb-dd__item"
              role="menuitem"
              type="button"
              disabled={it.disabled}
              onClick={() => {
                setOpen(false);
                it.onClick?.();
              }}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
