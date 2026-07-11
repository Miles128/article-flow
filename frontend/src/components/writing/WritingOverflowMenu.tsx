"use client";

import { useEffect, useRef, useState } from "react";
import { WritingFloatChip } from "@/components/writing/WritingFloatChip";

type MenuItem = {
  id: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

type Props = {
  items: MenuItem[];
};

export function WritingOverflowMenu({ items }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <WritingFloatChip
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        ⋯
      </WritingFloatChip>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 z-50 min-w-[9rem] py-1.5 flex flex-col gap-0.5"
          style={{
            background: "rgba(255, 252, 245, 0.96)",
            boxShadow:
              "0 8px 28px rgba(42, 28, 18, 0.12), 0 2px 8px rgba(42, 28, 18, 0.06)",
          }}
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              className="text-left px-4 py-2 text-xs text-ink-700 hover:bg-black/[0.03] disabled:opacity-40"
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
