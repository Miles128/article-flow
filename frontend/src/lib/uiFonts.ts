/** 界面字体 / 正文字体（与排版预览 themes.ts 无关） */

export const FONT_IDS = ['song', 'kai', 'hei'] as const;
export type FontId = (typeof FONT_IDS)[number];

export const DEFAULT_UI_FONT: FontId = 'kai';
export const DEFAULT_ARTICLE_FONT: FontId = 'song';

export interface FontOption {
  id: FontId;
  label: string;
  sample: string;
}

export const FONT_OPTIONS: FontOption[] = [
  { id: 'song', label: '宋体', sample: '正文之骨，宜长文阅读' },
  { id: 'kai', label: '楷体', sample: '标题之骨，宜卷首题签' },
  { id: 'hei', label: '黑体', sample: '界面之骨，宜导航按钮' },
];

const FONT_STACKS: Record<FontId, string> = {
  song:
    '"Songti SC", "STSong", "Noto Serif SC", "Source Han Serif SC", Georgia, serif',
  kai:
    '"Kaiti SC", "STKaiti", "KaiTi", "楷体", "BiauKai", "AR PL UKai CN", serif',
  hei:
    '"PingFang SC", "Microsoft YaHei", "Heiti SC", "STHeiti", "Noto Sans SC", sans-serif',
};

export function isFontId(value: string): value is FontId {
  return (FONT_IDS as readonly string[]).includes(value);
}

export function normalizeFontId(
  value: string | null | undefined,
  fallback: FontId,
): FontId {
  if (value && isFontId(value)) {
    return value;
  }
  return fallback;
}

export function fontStack(id: FontId): string {
  return FONT_STACKS[id];
}

export function applyUiFont(fontId: FontId): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.documentElement.setAttribute('data-ui-font', fontId);
  document.documentElement.style.setProperty('--font-ui', fontStack(fontId));
}

export function applyArticleFont(fontId: FontId): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.documentElement.setAttribute('data-article-font', fontId);
  document.documentElement.style.setProperty('--font-article', fontStack(fontId));
}

export function applyFontSettings(uiFont: FontId, articleFont: FontId): void {
  applyUiFont(uiFont);
  applyArticleFont(articleFont);
}
