'use client';

import { clsx } from 'clsx';
import { FONT_OPTIONS, fontStack } from '@/lib/uiFonts';
import { useUIStore } from '@/lib/store/uiStore';

function FontSegmentRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (id: (typeof FONT_OPTIONS)[number]['id']) => void;
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-xs text-ink-500 font-ui shrink-0 w-[4.5em]">
        {label}
      </span>
      <div className="wen-segment-group" role="group" aria-label={label}>
        {FONT_OPTIONS.map((f) => {
          const active = value === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onChange(f.id)}
              aria-pressed={active}
              className={clsx('wen-segment-btn', active && 'wen-segment-btn-active')}
              style={{ fontFamily: fontStack(f.id) }}
            >
              {f.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function UiFontSwitcher() {
  const uiFont = useUIStore((s) => s.uiFont);
  const articleFont = useUIStore((s) => s.articleFont);
  const setUiFont = useUIStore((s) => s.setUiFont);
  const setArticleFont = useUIStore((s) => s.setArticleFont);

  return (
    <div className="space-y-2.5">
      <FontSegmentRow label="界面" value={uiFont} onChange={setUiFont} />
      <FontSegmentRow label="正文" value={articleFont} onChange={setArticleFont} />
    </div>
  );
}
