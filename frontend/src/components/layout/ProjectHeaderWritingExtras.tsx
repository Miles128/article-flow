"use client";

import { useAppStore } from "@/lib/store";
import { useProjectStyleProfile } from "@/lib/hooks/useProjectStyleProfile";

export function ProjectHeaderWritingExtras() {
  const draftStatusText = useAppStore((s) => s.draftStatusText);
  const { styleProfileId, styleProfiles, saveStyleProfile } =
    useProjectStyleProfile();

  return (
    <div className="flex items-center justify-end gap-2 shrink-0 text-xs text-ink-500">
      {draftStatusText ? (
        <span className="shrink-0 whitespace-nowrap">{draftStatusText}</span>
      ) : null}
      <label className="flex items-center gap-1 shrink-0">
        <span className="text-ink-400">风格</span>
        <select
          value={styleProfileId}
          onChange={(e) => saveStyleProfile(e.target.value)}
          className="border border-surface-300 bg-surface-50/70 backdrop-blur-[2px] px-1.5 py-0.5 max-w-[140px] truncate text-ink-700"
        >
          <option value="">默认</option>
          {styleProfiles.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
