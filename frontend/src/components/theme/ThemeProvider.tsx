'use client';

import { useEffect } from 'react';
import { applyAppearance } from '@/lib/applyAppearance';
import {
  DEFAULT_ARTICLE_FONT,
  DEFAULT_UI_FONT,
  normalizeFontId,
} from '@/lib/uiFonts';
import { DEFAULT_UI_THEME, normalizeUiTheme } from '@/lib/uiThemes';
import { useUIStore } from '@/lib/store/uiStore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const uiTheme = normalizeUiTheme(useUIStore((s) => s.uiTheme) ?? DEFAULT_UI_THEME);
  const uiFont = normalizeFontId(
    useUIStore((s) => s.uiFont),
    DEFAULT_UI_FONT,
  );
  const articleFont = normalizeFontId(
    useUIStore((s) => s.articleFont),
    DEFAULT_ARTICLE_FONT,
  );

  useEffect(() => {
    applyAppearance({ uiTheme, uiFont, articleFont });
  }, [uiTheme, uiFont, articleFont]);

  useEffect(() => {
    const unsub = useUIStore.persist.onFinishHydration(() => {
      const s = useUIStore.getState();
      applyAppearance({
        uiTheme: normalizeUiTheme(s.uiTheme),
        uiFont: normalizeFontId(s.uiFont, DEFAULT_UI_FONT),
        articleFont: normalizeFontId(s.articleFont, DEFAULT_ARTICLE_FONT),
      });
    });
    if (useUIStore.persist.hasHydrated()) {
      const s = useUIStore.getState();
      applyAppearance({
        uiTheme: normalizeUiTheme(s.uiTheme),
        uiFont: normalizeFontId(s.uiFont, DEFAULT_UI_FONT),
        articleFont: normalizeFontId(s.articleFont, DEFAULT_ARTICLE_FONT),
      });
    }
    return unsub;
  }, []);

  return children;
}
