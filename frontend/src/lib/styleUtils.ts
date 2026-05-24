export interface CustomStyle {
  name: string;
  h1Color: string;
  h2Color: string;
  h3Color: string;
  pColor: string;
  strongColor: string;
  emColor: string;
  blockquoteColor: string;
  aColor: string;
  h1Bg: string;
  h2Bg: string;
  h3Bg: string;
  pBg: string;
  blockquoteBg: string;
  codeBg: string;
  fontFamily: string;
  h1FontSize: number;
  h2FontSize: number;
  h3FontSize: number;
  pFontSize: number;
  pLineHeight: number;
  codeTheme: string;
}

const STORAGE_KEY = 'article-flow-custom-styles';

export const defaultStyle: CustomStyle = {
  name: '自定义样式',
  h1Color: '#ff6600',
  h2Color: '#e55a00',
  h3Color: '#cc5500',
  pColor: '#333333',
  strongColor: '#ff6600',
  emColor: '#ff6600',
  blockquoteColor: '#666666',
  aColor: '#ff6600',
  h1Bg: 'transparent',
  h2Bg: 'transparent',
  h3Bg: 'transparent',
  pBg: 'transparent',
  blockquoteBg: '#fff8f0',
  codeBg: '#f5f5f5',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  h1FontSize: 20,
  h2FontSize: 17,
  h3FontSize: 14,
  pFontSize: 15,
  pLineHeight: 2,
  codeTheme: 'atom-one-dark',
};

export function generateCssFromStyle(style: CustomStyle): string {
  const h1BgStyle = style.h1Bg !== 'transparent' ? `background: ${style.h1Bg};` : '';
  const h2BgStyle = style.h2Bg !== 'transparent' ? `background: ${style.h2Bg}; padding: 8px 14px; border-radius: 8px;` : 'padding: 0 0 8px; border-bottom: 2px solid ' + style.h2Color + ';';
  const h3BgStyle = style.h3Bg !== 'transparent' ? `background: ${style.h3Bg}; padding: 6px 12px; border-radius: 6px;` : '';
  const pBgStyle = style.pBg !== 'transparent' ? `background: ${style.pBg}; padding: 4px 0;` : '';
  const blockquoteBgStyle = style.blockquoteBg !== 'transparent' ? `background: ${style.blockquoteBg};` : '';
  const codeBgColor = style.codeBg !== 'transparent' ? style.codeBg : '#f5f5f5';

  return `
    .preview-content { font-family: ${style.fontFamily}; }
    .preview-content h1 { font-size: ${style.h1FontSize}pt; font-weight: bold; color: ${style.h1Color}; text-align: center; margin: 30px 0 20px; ${h1BgStyle} }
    .preview-content h2 { font-size: ${style.h2FontSize}pt; font-weight: bold; color: ${style.h2Color}; margin: 25px 0 15px; ${h2BgStyle} }
    .preview-content h3 { font-size: ${style.h3FontSize}pt; font-weight: bold; color: ${style.h3Color}; margin: 20px 0 10px; ${h3BgStyle} }
    .preview-content p { font-size: ${style.pFontSize}px; color: ${style.pColor}; line-height: ${style.pLineHeight}; margin: 0 0 16px; ${pBgStyle} }
    .preview-content strong { color: ${style.strongColor}; font-weight: bold; }
    .preview-content em { font-style: italic; color: ${style.emColor}; }
    .preview-content a { color: ${style.aColor}; text-decoration: none; border-bottom: 1px solid ${style.aColor}; }
    .preview-content blockquote { border-left: 4px solid ${style.blockquoteColor}; padding: 10px 16px; margin: 16px 0; ${blockquoteBgStyle} color: ${style.blockquoteColor}; font-style: italic; }
    .preview-content ul, .preview-content ol { padding-left: 2em; margin: 10px 0; color: ${style.pColor}; line-height: ${style.pLineHeight}; }
    .preview-content li { margin-bottom: 6px; }
    .preview-content code { background: ${codeBgColor}; color: ${style.strongColor}; padding: 2px 6px; border-radius: 3px; font-size: 13px; font-family: Consolas, Monaco, monospace; }
    .preview-content pre { background: #282c34; color: #abb2bf; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 16px 0; font-size: 13px; line-height: 1.6; }
    .preview-content pre code { background: none; color: inherit; padding: 0; }
    .preview-content img { max-width: 100%; border-radius: 8px; margin: 16px 0; }
    .preview-content hr { border: none; border-top: 1px dashed #d1d5db; margin: 24px 0; }
    .preview-content table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    .preview-content th { background: ${codeBgColor}; color: ${style.h1Color}; font-weight: bold; padding: 10px; border: 1px solid #e5e7eb; text-align: left; }
    .preview-content td { padding: 10px; border: 1px solid #e5e7eb; color: ${style.pColor}; }
  `;
}

export function loadSavedStyles(): CustomStyle[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStylesToStorage(styles: CustomStyle[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(styles));
}