import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { applyAppearance } from '@/lib/applyAppearance';
import {
  DEFAULT_ARTICLE_FONT,
  DEFAULT_UI_FONT,
  normalizeFontId,
  type FontId,
} from '@/lib/uiFonts';
import {
  DEFAULT_UI_THEME,
  normalizeUiTheme,
  type UiThemeId,
} from '@/lib/uiThemes';

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  uiTheme: UiThemeId;
  uiFont: FontId;
  articleFont: FontId;

  toggleSidebar: () => void;
  toggleSidebarCollapsed: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setUiTheme: (theme: UiThemeId) => void;
  setUiFont: (font: FontId) => void;
  setArticleFont: (font: FontId) => void;
}

function syncAppearance(state: Pick<UIState, 'uiTheme' | 'uiFont' | 'articleFont'>): void {
  applyAppearance({
    uiTheme: state.uiTheme,
    uiFont: state.uiFont,
    articleFont: state.articleFont,
  });
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarOpen: false,
      sidebarCollapsed: false,
      uiTheme: DEFAULT_UI_THEME,
      uiFont: DEFAULT_UI_FONT,
      articleFont: DEFAULT_ARTICLE_FONT,

      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      toggleSidebarCollapsed: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setUiTheme: (theme) => {
        const uiTheme = normalizeUiTheme(theme);
        const next = { ...get(), uiTheme };
        syncAppearance(next);
        set({ uiTheme });
      },
      setUiFont: (font) => {
        const uiFont = normalizeFontId(font, DEFAULT_UI_FONT);
        const next = { ...get(), uiFont };
        syncAppearance(next);
        set({ uiFont });
      },
      setArticleFont: (font) => {
        const articleFont = normalizeFontId(font, DEFAULT_ARTICLE_FONT);
        const next = { ...get(), articleFont };
        syncAppearance(next);
        set({ articleFont });
      },
    }),
    {
      name: 'article-flow-ui',
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => undefined,
            removeItem: () => undefined,
          };
        }
        try {
          return window.localStorage;
        } catch {
          return {
            getItem: () => null,
            setItem: () => undefined,
            removeItem: () => undefined,
          };
        }
      }),
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        uiTheme: state.uiTheme,
        uiFont: state.uiFont,
        articleFont: state.articleFont,
      }),
      migrate: (persisted) => {
        const row = persisted as {
          uiTheme?: string;
          uiFont?: string;
          articleFont?: string;
          sidebarCollapsed?: boolean;
        };
        const uiTheme = normalizeUiTheme(row?.uiTheme);
        const uiFont = normalizeFontId(row?.uiFont, DEFAULT_UI_FONT);
        const articleFont = normalizeFontId(row?.articleFont, DEFAULT_ARTICLE_FONT);
        return {
          sidebarCollapsed: row?.sidebarCollapsed ?? false,
          uiTheme,
          uiFont,
          articleFont,
        };
      },
      version: 2,
      onRehydrateStorage: () => (state) => {
        if (state) {
          syncAppearance(state);
        }
      },
    },
  ),
);
