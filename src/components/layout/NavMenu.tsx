"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import type { MobileNavItem } from "./MobileNav";

// Desktop "More" dropdown — collapses the secondary routes (ecosystem, reference,
// match) behind one trigger so the lg+ strip keeps the four primary tabs concrete.
// Client-only: owns the open/closed toggle, closes on Escape, on outside click, and
// on navigation. The phone disclosure (MobileNav) lists the same routes flat instead.
export function NavMenu({ label, items }: { label: string; items: MobileNavItem[] }) {
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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className="flex items-center gap-1 px-2 py-2 uppercase tracking-widest text-muted transition hover:text-text"
      >
        {label}
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
          {items.map((item) => (
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
