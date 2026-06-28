"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import type { MobileNavItem } from "./MobileNav";

// A dropdown nav tab: clicking the label opens a menu listing ALL related routes
// (primary + secondary) so people see both options at once instead of hunting a
// tiny caret. Closes on Escape, outside-click, and navigation.
export function NavGroup({
  primary,
  items,
  moreLabel,
}: {
  primary: MobileNavItem;
  items: MobileNavItem[];
  moreLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onPointer(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const allItems = [primary, ...items];

  return (
    <div ref={ref} className="relative flex items-center">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`${primary.label}: ${moreLabel}`}
        className="flex items-center gap-1 px-2 py-2 uppercase tracking-widest text-muted hover:text-text"
      >
        {primary.label}
        <svg
          viewBox="0 0 24 24"
          width="12"
          height="12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={`block transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute left-0 top-full z-50 mt-1 flex min-w-44 flex-col rounded-token border border-border bg-surface p-1 shadow-lg"
        >
          {allItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="rounded-token px-3 py-2 uppercase tracking-widest text-muted transition hover:bg-surface-2 hover:text-text"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
