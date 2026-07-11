/** 界面主题（壳层配色与纸墨背景，与排版预览 themes.ts 无关） */

export const UI_THEME_IDS = [
  'shuyuan',
  'shuimo',
  'cyber',
  'minimal',
  'material',
  'slate',
  'ocean',
] as const;
export type UiThemeId = (typeof UI_THEME_IDS)[number];

/** @deprecated 旧版素笺，自动映射为 minimal */
export const LEGACY_UI_THEME_ALIASES: Record<string, UiThemeId> = {
  plain: 'minimal',
};

export const DEFAULT_UI_THEME: UiThemeId = 'shuyuan';

export const UI_THEME_STORAGE_KEY = 'article-flow-ui-theme';

export interface UiThemeMeta {
  id: UiThemeId;
  label: string;
  description: string;
  /** 设置页色块预览 */
  preview: { bg: string; accent: string; fg: string };
}

export const UI_THEMES: UiThemeMeta[] = [
  {
    id: 'shuyuan',
    label: '书斋墨韵',
    description: '牛皮纸渐变、朱印强调、册页侧栏（默认纸质）',
    preview: { bg: '#e8d4b0', accent: '#b84a32', fg: '#1a1612' },
  },
  {
    id: 'shuimo',
    label: '水墨',
    description: '宣纸灰、墨色层次、淡墨晕染，无暖黄底',
    preview: { bg: '#ececea', accent: '#3a3a38', fg: '#1a1a18' },
  },
  {
    id: 'cyber',
    label: '赛博朋克打字',
    description: '暗底霓虹、等宽字体、扫描线复古终端感',
    preview: { bg: '#0a0e14', accent: '#00f5d4', fg: '#e0fff8' },
  },
  {
    id: 'minimal',
    label: 'Minimal',
    description: '纯白留白、细线框、无纹理，极致克制',
    preview: { bg: '#ffffff', accent: '#111111', fg: '#171717' },
  },
  {
    id: 'material',
    label: 'Material',
    description: '常见写作 App：白卡片、阴影层级、系统无衬线',
    preview: { bg: '#f5f5f5', accent: '#1a73e8', fg: '#202124' },
  },
  {
    id: 'slate',
    label: '墨夜专注',
    description: '深灰护眼、低对比荧光点缀，适合长时间写作',
    preview: { bg: '#1e293b', accent: '#38bdf8', fg: '#f1f5f9' },
  },
  {
    id: 'ocean',
    label: '海雾清单',
    description: '雾蓝灰底、清爽分区，类似 Notion / 飞书文档',
    preview: { bg: '#eef4f8', accent: '#0d6e99', fg: '#1a3a4a' },
  },
];

const NUMERALS = [
  '壹',
  '贰',
  '叁',
  '肆',
  '伍',
  '陆',
  '柒',
  '捌',
  '玖',
  '拾',
] as const;

export function stepNumeral(index: number): string {
  if (index >= 1 && index <= NUMERALS.length) {
    return NUMERALS[index - 1];
  }
  return String(index);
}

export function isUiThemeId(value: string): value is UiThemeId {
  return (UI_THEME_IDS as readonly string[]).includes(value);
}

export function normalizeUiTheme(value: string | null | undefined): UiThemeId {
  if (value && isUiThemeId(value)) {
    return value;
  }
  if (value && LEGACY_UI_THEME_ALIASES[value]) {
    return LEGACY_UI_THEME_ALIASES[value];
  }
  return DEFAULT_UI_THEME;
}

/** 暗色主题：主界面与正文编辑区统一深色；其余为亮色 */
export const UI_THEME_COLOR_SCHEME: Record<UiThemeId, 'light' | 'dark'> = {
  shuyuan: 'light',
  shuimo: 'light',
  cyber: 'dark',
  minimal: 'light',
  material: 'light',
  slate: 'dark',
  ocean: 'light',
};

export function uiThemeColorScheme(themeId: UiThemeId): 'light' | 'dark' {
  return UI_THEME_COLOR_SCHEME[themeId];
}

export function applyUiTheme(themeId: UiThemeId): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.documentElement.setAttribute('data-ui-theme', themeId);
  document.documentElement.setAttribute(
    'data-color-scheme',
    uiThemeColorScheme(themeId),
  );
}
