'use client';

import { clsx } from 'clsx';
import { UI_THEMES } from '@/lib/uiThemes';
import { useUIStore } from '@/lib/store/uiStore';

export function UiThemeSwitcher() {
  const uiTheme = useUIStore((s) => s.uiTheme);
  const setUiTheme = useUIStore((s) => s.setUiTheme);

  return (
    <div className="space-y-2">
      <span className="text-xs text-ink-500 font-ui">界面主题</span>
      <div className="wen-segment-group flex-wrap" role="group" aria-label="界面主题">
        {UI_THEMES.map((t) => {
          const active = uiTheme === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setUiTheme(t.id)}
              aria-pressed={active}
              title={t.description}
              className={clsx(
                'wen-segment-btn wen-segment-btn-theme inline-flex items-center gap-1.5',
                active && 'wen-segment-btn-active',
              )}
            >
              <span
                className="w-3 h-3 rounded-full shrink-0 border border-black/10"
                style={{ background: t.preview.bg }}
                aria-hidden
              />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
