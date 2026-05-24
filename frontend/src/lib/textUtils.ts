/** 与编辑器一致的字数统计：中文按字 + 英文/数字按词（标点、Markdown 符号不计） */
export function countArticleWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const cjkCount = (trimmed.match(/[\u4e00-\u9fa5]/g) ?? []).length;
  const latinOnly = trimmed.replace(/[\u4e00-\u9fa5]/g, ' ');
  const latinWords = latinOnly.split(/\s+/).filter((w) => /[a-zA-Z0-9]/.test(w));
  return cjkCount + latinWords.length;
}
