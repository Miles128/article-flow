"use client";

import { useAppStore } from "@/lib/store";

export function ProjectHeaderWritingExtras() {
  const draftStatusText = useAppStore((s) => s.draftStatusText);

  if (!draftStatusText) return null;

  return (
    <div className="flex items-center justify-end gap-2 shrink-0 text-xs text-ink-500">
      <span className="shrink-0 whitespace-nowrap">{draftStatusText}</span>
    </div>
  );
}
