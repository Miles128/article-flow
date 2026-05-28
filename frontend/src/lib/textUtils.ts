/** 与编辑器一致的字数统计：中文按字 + 英文/数字按词（标点、Markdown 符号不计） */
export function countArticleWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const cjkCount = (trimmed.match(/[\u4e00-\u9fa5]/g) ?? []).length;
  const latinOnly = trimmed.replace(/[\u4e00-\u9fa5]/g, ' ');
  const latinWords = latinOnly.split(/\s+/).filter((w) => /[a-zA-Z0-9]/.test(w));
  return cjkCount + latinWords.length;
}

const TITLE_LINE = /^#\s+\S/;

/** 拆分首行 Markdown 一级标题与正文 */
export function splitMarkdownTitle(content: string): { title: string; body: string } {
  const text = content ?? '';
  if (!text.trim()) return { title: '', body: text };
  const lines = text.split('\n');
  const firstIdx = lines.findIndex((line) => line.trim());
  if (firstIdx < 0) return { title: '', body: text };
  if (!TITLE_LINE.test(lines[firstIdx].trim())) return { title: '', body: text };
  let end = firstIdx + 1;
  while (end < lines.length && !lines[end].trim()) end += 1;
  const title = lines.slice(0, end).join('\n');
  const body = lines.slice(end).join('\n');
  return { title, body };
}

/** AI 改写正文后，强制保留原文首行 # 标题 */
/** 在正文中替换首次出现的片段（用于选中改写） */
export function replaceTextInDocument(
  document: string,
  target: string,
  replacement: string,
): string {
  if (!target.trim()) return replacement;
  const idx = document.indexOf(target);
  if (idx < 0) return document;
  return document.slice(0, idx) + replacement + document.slice(idx + target.length);
}

export function mergePreservedTitle(original: string, rewritten: string): string {
  const preserved = splitMarkdownTitle(original);
  if (!preserved.title) return rewritten;

  const { title: newTitle, body: newBody } = splitMarkdownTitle(rewritten);
  if (newTitle.trim() === preserved.title.trim()) return rewritten;

  const body = (newTitle ? newBody : rewritten).replace(/^\n+/, '').trimEnd();
  return body ? `${preserved.title}\n\n${body}` : preserved.title;
}
