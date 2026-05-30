import { applyFontSettings, type FontId } from '@/lib/uiFonts';
import { applyUiTheme, type UiThemeId } from '@/lib/uiThemes';

export function applyAppearance(settings: {
  uiTheme: UiThemeId;
  uiFont: FontId;
  articleFont: FontId;
}): void {
  applyUiTheme(settings.uiTheme);
  applyFontSettings(settings.uiFont, settings.articleFont);
}

/** 从 localStorage 恢复外观（layout 内联脚本与客户端首屏共用逻辑） */
export function readPersistedAppearance(): {
  uiTheme?: string;
  uiFont?: string;
  articleFont?: string;
} | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem('article-flow-ui');
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as { state?: Record<string, unknown> };
    const state: Record<string, unknown> =
      (parsed.state ?? parsed) as Record<string, unknown>;
    return {
      uiTheme: typeof state.uiTheme === 'string' ? state.uiTheme : undefined,
      uiFont: typeof state.uiFont === 'string' ? state.uiFont : undefined,
      articleFont:
        typeof state.articleFont === 'string' ? state.articleFont : undefined,
    };
  } catch {
    return null;
  }
}
