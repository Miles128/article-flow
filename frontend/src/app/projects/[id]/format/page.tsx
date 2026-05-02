'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { formatApi, projectsApi } from '@/lib/api/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Type, 
  FileText,
  Loader2,
  ChevronDown,
  Palette,
  Download,
  Upload,
  Settings,
  X,
  Square,
  Circle,
  Minus,
  Check,
  Copy,
  ClipboardCheck,
  FolderOpen,
  Save
} from 'lucide-react';
import { clsx } from 'clsx';

interface StyleConfig {
  themeColor: string;
  h2Color: string;
  h2BgColor: string;
  h2BgShape: 'none' | 'square' | 'rounded' | 'pill';
  bodyFont: string;
  bodyFontSize: number;
  bodyColor: string;
  boldColor: string;
  quoteColor: string;
  quoteBgColor: string;
  quoteBgShape: 'none' | 'square' | 'rounded' | 'pill';
}

const defaultStyles: StyleConfig = {
  themeColor: '#0ea5e9',
  h2Color: '#111827',
  h2BgColor: '#f0f9ff',
  h2BgShape: 'rounded',
  bodyFont: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  bodyFontSize: 15,
  bodyColor: '#111827',
  boldColor: '#111827',
  quoteColor: '#6b7280',
  quoteBgColor: '#f9fafb',
  quoteBgShape: 'rounded',
};

const colorPresets = [
  '#0ea5e9', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  '#3b82f6', '#14b8a6', '#f97316', '#f43f5e',
  '#6366f1', '#a855f7', '#0891b2', '#65a30d',
  '#1d4ed8', '#059669', '#d97706', '#dc2626',
  '#4f46e5', '#9333ea', '#0e7490', '#4d7c0f',
  '#111827', '#1f2937', '#374151', '#4b5563',
  '#facc15', '#fef08a', '#e5e7eb', '#f3f4f6',
];

const fontOptions = [
  { label: '系统默认', value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  { label: '苹方', value: '"PingFang SC", sans-serif' },
  { label: '思源黑体', value: '"Source Han Sans SC", sans-serif' },
  { label: '微软雅黑', value: '"Microsoft YaHei", sans-serif' },
  { label: '宋体', value: '"SimSun", serif' },
  { label: '楷体', value: '"KaiTi", serif' },
];

const bgShapeOptions = [
  { label: '无', value: 'none', icon: Minus },
  { label: '直角', value: 'square', icon: Square },
  { label: '圆角', value: 'rounded', icon: Circle },
  { label: '胶囊', value: 'pill', icon: Circle },
];

const presetThemes = [
  {
    name: '经典商务',
    styles: {
      ...defaultStyles,
      themeColor: '#B8860B',
      h2Color: '#4A4A4A',
      h2BgColor: '#F5F5F0',
      bodyColor: '#333333',
      boldColor: '#1A1A1A',
      quoteColor: '#888888',
      quoteBgColor: '#FAFAFA',
      h2BgShape: 'rounded',
      quoteBgShape: 'none',
    }
  },
  {
    name: '科技蓝',
    styles: {
      ...defaultStyles,
      themeColor: '#2563EB',
      h2Color: '#3B82F6',
      h2BgColor: '#EFF6FF',
      bodyColor: '#374151',
      boldColor: '#DC2626',
      quoteColor: '#9CA3AF',
      quoteBgColor: '#F8FAFC',
      h2BgShape: 'rounded',
      quoteBgShape: 'none',
    }
  },
  {
    name: '极简灰度',
    styles: {
      ...defaultStyles,
      themeColor: '#000000',
      h2Color: '#333333',
      h2BgColor: '#FAFAFA',
      bodyColor: '#4B4B4B',
      boldColor: '#000000',
      quoteColor: '#A0A0A0',
      quoteBgColor: '#FAFAFA',
      h2BgShape: 'none',
      quoteBgShape: 'none',
    }
  },
  {
    name: '暖调人文',
    styles: {
      ...defaultStyles,
      themeColor: '#92400E',
      h2Color: '#B45309',
      h2BgColor: '#FEF3C7',
      bodyColor: '#44403C',
      boldColor: '#B45309',
      quoteColor: '#A8A29E',
      quoteBgColor: '#FFFBEB',
      h2BgShape: 'rounded',
      quoteBgShape: 'rounded',
    }
  },
  {
    name: '健康绿',
    styles: {
      ...defaultStyles,
      themeColor: '#15803D',
      h2Color: '#16A34A',
      h2BgColor: '#DCFCE7',
      bodyColor: '#3F3F46',
      boldColor: '#16A34A',
      quoteColor: '#A1A1AA',
      quoteBgColor: '#F0FDF4',
      h2BgShape: 'rounded',
      quoteBgShape: 'rounded',
    }
  },
  {
    name: '知识蓝',
    styles: {
      ...defaultStyles,
      themeColor: '#0369A1',
      h2Color: '#0EA5E9',
      h2BgColor: '#E0F2FE',
      bodyColor: '#334155',
      boldColor: '#EA580C',
      quoteColor: '#94A3B8',
      quoteBgColor: '#F0F9FF',
      h2BgShape: 'rounded',
      quoteBgShape: 'none',
    }
  },
  {
    name: '时尚粉',
    styles: {
      ...defaultStyles,
      themeColor: '#BE185D',
      h2Color: '#DB2777',
      h2BgColor: '#FCE7F3',
      bodyColor: '#4B5563',
      boldColor: '#DB2777',
      quoteColor: '#9CA3AF',
      quoteBgColor: '#FDF2F8',
      h2BgShape: 'pill',
      quoteBgShape: 'rounded',
    }
  },
  {
    name: '政务红',
    styles: {
      ...defaultStyles,
      themeColor: '#B91C1C',
      h2Color: '#DC2626',
      h2BgColor: '#FEE2E2',
      bodyColor: '#1F2937',
      boldColor: '#B91C1C',
      quoteColor: '#6B7280',
      quoteBgColor: '#FEF2F2',
      h2BgShape: 'rounded',
      quoteBgShape: 'none',
    }
  },
  {
    name: '极致高级灰',
    styles: {
      ...defaultStyles,
      themeColor: '#8C7B6B',
      h2Color: '#8C7B6B',
      h2BgColor: '#EFEFEF',
      bodyColor: '#2C2C2C',
      boldColor: '#1A1A1A',
      quoteColor: '#8C7B6B',
      quoteBgColor: '#F9F9F9',
      h2BgShape: 'rounded',
      quoteBgShape: 'none',
    }
  },
  {
    name: '藏青睿智',
    styles: {
      ...defaultStyles,
      themeColor: '#0F2B46',
      h2Color: '#1E4D78',
      h2BgColor: '#EDF2F7',
      bodyColor: '#333333',
      boldColor: '#0F2B46',
      quoteColor: '#CDA44E',
      quoteBgColor: '#FFFDF5',
      h2BgShape: 'rounded',
      quoteBgShape: 'none',
    }
  },
  {
    name: '东方雅韵',
    styles: {
      ...defaultStyles,
      themeColor: '#2F4F4F',
      h2Color: '#5F7A7A',
      h2BgColor: '#F0EDE8',
      bodyColor: '#3E3A36',
      boldColor: '#2F4F4F',
      quoteColor: '#8B4513',
      quoteBgColor: '#FAF7F2',
      h2BgShape: 'rounded',
      quoteBgShape: 'none',
    }
  },
  {
    name: '大地沉稳',
    styles: {
      ...defaultStyles,
      themeColor: '#4A4238',
      h2Color: '#6B5D52',
      h2BgColor: '#F2F0ED',
      bodyColor: '#2D2D2D',
      boldColor: '#4A4238',
      quoteColor: '#8B7355',
      quoteBgColor: '#F8F6F3',
      h2BgShape: 'rounded',
      quoteBgShape: 'none',
    }
  },
  {
    name: '翡翠生机',
    styles: {
      ...defaultStyles,
      themeColor: '#1B4332',
      h2Color: '#2D6A4F',
      h2BgColor: '#ECFDF5',
      bodyColor: '#2C3333',
      boldColor: '#1B4332',
      quoteColor: '#D4AF37',
      quoteBgColor: '#FFFCF0',
      h2BgShape: 'rounded',
      quoteBgShape: 'none',
    }
  },
  {
    name: '科技深空',
    styles: {
      ...defaultStyles,
      themeColor: '#111827',
      h2Color: '#374151',
      h2BgColor: '#F3F4F6',
      bodyColor: '#1F2937',
      boldColor: '#111827',
      quoteColor: '#2563EB',
      quoteBgColor: '#F0F5FF',
      h2BgShape: 'rounded',
      quoteBgShape: 'none',
    }
  },
  {
    name: '极简黑白',
    styles: {
      ...defaultStyles,
      themeColor: '#000000',
      h2Color: '#4B4B4B',
      h2BgColor: '#F5F5F5',
      bodyColor: '#4B4B4B',
      boldColor: '#000000',
      quoteColor: '#999999',
      quoteBgColor: '#FAFAFA',
      h2BgShape: 'none',
      quoteBgShape: 'none',
    }
  },
  {
    name: '玫瑰金奢华',
    styles: {
      ...defaultStyles,
      themeColor: '#2C2C2C',
      h2Color: '#5C4033',
      h2BgColor: '#FBF7F4',
      bodyColor: '#3D3D3D',
      boldColor: '#2C2C2C',
      quoteColor: '#B76E79',
      quoteBgColor: '#FDF8F9',
      h2BgShape: 'pill',
      quoteBgShape: 'rounded',
    }
  },
];

const IPHONE_17_WIDTH = 393;

export default function FormatPage() {
  const params = useParams();
  const { setCurrentStep } = useAppStore();
  const [content, setContent] = useState('');
  const [convertedContent, setConvertedContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showStyleToolbar, setShowStyleToolbar] = useState(false);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [styles, setStyles] = useState<StyleConfig>(defaultStyles);
  const [isConverting, setIsConverting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeColorPicker, setActiveColorPicker] = useState<string | null>(null);

  useEffect(() => {
    setCurrentStep(7);
    loadContent();
  }, []);

  async function loadContent() {
    if (!params.id) return;
    
    setIsLoading(true);
    try {
      const response = await projectsApi.getContents(params.id as string, 5);
      if (response.data.length > 0) {
        setContent(response.data[0].content);
      } else {
        setContent('');
      }
    } catch (error) {
      console.error('Failed to load content:', error);
      setContent('');
    } finally {
      setIsLoading(false);
    }
  }

  const displayContent = convertedContent || content || '';

  const currentPreset = presetThemes.find(p => 
    JSON.stringify(p.styles) === JSON.stringify(styles)
  );

  function handleExportCSS() {
    const cssContent = `/* 微信公众号样式配置 */
:root {
  --theme-color: ${styles.themeColor};
  --h2-color: ${styles.h2Color};
  --h2-bg-color: ${styles.h2BgColor};
  --h2-bg-shape: ${styles.h2BgShape};
  --body-font: ${styles.bodyFont};
  --body-font-size: ${styles.bodyFontSize}pt;
  --body-color: ${styles.bodyColor};
  --bold-color: ${styles.boldColor};
  --quote-color: ${styles.quoteColor};
  --quote-bg-color: ${styles.quoteBgColor};
  --quote-bg-shape: ${styles.quoteBgShape};
}

/* 使用方法：将此 CSS 应用到你的文章样式中 */
`;
    const blob = new Blob([cssContent], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wechat-style.css';
    a.click();
    URL.revokeObjectURL(url);
  }

  function generateFullHtml(): string {
    if (!displayContent) return '';
    const bodyHtml = convertMarkdownToWechatHtml(displayContent);
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>文章</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: ${styles.bodyFont}; 
      background-color: #fafafa;
      padding: 20px;
    }
    .article-container {
      max-width: 480px;
      margin: 0 auto;
      background: white;
    }
  </style>
</head>
<body>
  <div class="article-container">
${bodyHtml}
  </div>
</body>
</html>`;
  }

  async function handleSaveAs(format: 'md' | 'html') {
    if (!displayContent) return;
    setSaveStatus('saving');
    
    try {
      let content: string;
      let suggestedName: string;
      let mimeType: string;
      
      if (format === 'md') {
        content = displayContent;
        suggestedName = 'article.md';
        mimeType = 'text/markdown';
      } else {
        content = generateFullHtml();
        suggestedName = 'article.html';
        mimeType = 'text/html';
      }
      
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName,
          types: [{
            description: format === 'md' ? 'Markdown 文件' : 'HTML 文件',
            accept: {
              [mimeType]: [format === 'md' ? '.md' : '.html']
            }
          }]
        });
        
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
      } catch {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = suggestedName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      
      setShowSaveMenu(false);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Save failed:', err);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus(''), 2000);
      } else {
        setSaveStatus('');
      }
    }
  }

  async function handleLoadFromLocal() {
    setSaveStatus('loading');
    try {
      const [fileHandle] = await (window as any).showOpenFilePicker({
        types: [
          {
            description: 'Markdown 文件',
            accept: {
              'text/markdown': ['.md'],
              'text/plain': ['.md']
            }
          }
        ]
      });
      
      const file = await fileHandle.getFile();
      const loadedMd = await file.text();
      
      setContent(loadedMd);
      
      setSaveStatus('loaded');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Load failed:', err);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus(''), 2000);
      } else {
        setSaveStatus('');
      }
    }
  }

  function handleImportCSS(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const cssText = event.target?.result as string;
      const newStyles = { ...styles };
      
      const matches: Record<string, string> = {};
      cssText.replace(/--([\w-]+):\s*([^;]+);/g, (_, key, value) => {
        matches[key] = value.trim();
        return '';
      });

      if (matches['theme-color']) newStyles.themeColor = matches['theme-color'];
      if (matches['h2-color']) newStyles.h2Color = matches['h2-color'];
      if (matches['h2-bg-color']) newStyles.h2BgColor = matches['h2-bg-color'];
      if (matches['h2-bg-shape']) newStyles.h2BgShape = matches['h2-bg-shape'] as any;
      if (matches['body-font']) newStyles.bodyFont = matches['body-font'];
      if (matches['body-font-size']) newStyles.bodyFontSize = parseInt(matches['body-font-size']);
      if (matches['body-color']) newStyles.bodyColor = matches['body-color'];
      if (matches['bold-color']) newStyles.boldColor = matches['bold-color'];
      if (matches['quote-color']) newStyles.quoteColor = matches['quote-color'];
      if (matches['quote-bg-color']) newStyles.quoteBgColor = matches['quote-bg-color'];
      if (matches['quote-bg-shape']) newStyles.quoteBgShape = matches['quote-bg-shape'] as any;

      setStyles(newStyles);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function getBgShapeRadius(shape: string) {
    switch (shape) {
      case 'square': return '0px';
      case 'rounded': return '8px';
      case 'pill': return '9999px';
      default: return '0px';
    }
  }

  function convertMarkdownToWechatHtml(markdown: string): string {
    if (!markdown.trim()) return '';

    const lines = markdown.split('\n');
    const result: string[] = [];
    let inCodeBlock = false;
    let codeLang = '';
    let codeContent: string[] = [];
    let inList = false;
    let listType: 'ul' | 'ol' | null = null;
    let listContent: string[] = [];
    let inTable = false;
    let tableContent: string[] = [];

    function flushList() {
      if (listType && listContent.length > 0) {
        const listTag = listType === 'ul' ? 'ul' : 'ol';
        result.push(`<${listTag} style="font-size: ${styles.bodyFontSize}pt; color: ${styles.bodyColor}; line-height: 200%; margin-top: 16px; margin-bottom: 16px; padding-left: 24px; list-style-type: ${listType === 'ul' ? 'disc' : 'decimal'};">`);
        result.push(...listContent);
        result.push(`</${listTag}>`);
        listContent = [];
        listType = null;
        inList = false;
      }
    }

    function flushTable() {
      if (tableContent.length > 0) {
        result.push(`<table style="width: 100%; border-collapse: collapse; font-size: 14px; border: 1px solid #e5e7eb; margin-top: 16px; margin-bottom: 16px;">`);
        result.push(...tableContent);
        result.push('</table>');
        tableContent = [];
        inTable = false;
      }
    }

    function processInlineStyles(text: string): string {
      let processed = text;
      
      processed = processed.replace(/\*\*\*(.+?)\*\*\*/g, `<strong style="font-weight: 700; color: ${styles.boldColor};"><em style="font-style: italic;">$1</em></strong>`);
      
      processed = processed.replace(/\*\*(.+?)\*\*/g, `<strong style="font-weight: 700; color: ${styles.boldColor};">$1</strong>`);
      
      processed = processed.replace(/(?<!\*)\*(.+?)\*(?!\*)/g, `<em style="font-style: italic;">$1</em>`);
      
      processed = processed.replace(/`([^`]+)`/g, `<code style="background-color: #f3f4f6; color: #ef4444; padding: 2px 6px; border-radius: 4px; font-family: Consolas, Monaco, monospace; font-size: 13px;">$1</code>`);
      
      processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, `<a href="$2" style="color: ${styles.themeColor}; text-decoration: underline;">$1</a>`);
      
      processed = processed.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, `<img src="$2" alt="$1" style="max-width: 100%; height: auto; border-radius: 8px; margin-top: 16px; margin-bottom: 16px;" />`);
      
      return processed;
    }

    function processTableRow(row: string, isHeader: boolean = false): string {
      const cells = row.split('|').filter(c => c.trim() !== '');
      const cellTag = isHeader ? 'th' : 'td';
      const cellStyles = isHeader 
        ? `border: 1px solid #e5e7eb; padding: 10px 12px; text-align: left; font-weight: 600; color: ${styles.themeColor}; background-color: ${styles.h2BgColor};`
        : `border: 1px solid #e5e7eb; padding: 10px 12px; color: ${styles.bodyColor};`;
      
      return `<tr>${cells.map(cell => `<${cellTag} style="${cellStyles}">${processInlineStyles(cell.trim())}</${cellTag}>`).join('')}</tr>`;
    }

    for (const line of lines) {
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          const codeHtml = codeContent.join('\n');
          result.push(`<pre style="background-color: #1f2937; color: #e5e7eb; padding: 16px; border-radius: 8px; overflow-x: auto; margin-top: 16px; margin-bottom: 16px; font-size: 13px; line-height: 160%; font-family: Consolas, Monaco, monospace;"><code>${codeHtml}</code></pre>`);
          codeContent = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
          codeLang = line.slice(3).trim();
        }
        continue;
      }

      if (inCodeBlock) {
        codeContent.push(line.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
        continue;
      }

      if (line.startsWith('|') && line.endsWith('|')) {
        if (!inTable) {
          inTable = true;
          tableContent.push(processTableRow(line, true));
          continue;
        }
        
        if (line.includes('---')) {
          continue;
        }
        
        tableContent.push(processTableRow(line, false));
        continue;
      } else if (inTable) {
        flushTable();
      }

      if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('+ ')) {
        flushList();
        inList = true;
        listType = 'ul';
        listContent.push(`<li style="margin-bottom: 8px;">${processInlineStyles(line.slice(2).trim())}</li>`);
        continue;
      }

      if (/^\d+\.\s/.test(line)) {
        flushList();
        inList = true;
        listType = 'ol';
        const content = line.replace(/^\d+\.\s/, '');
        listContent.push(`<li style="margin-bottom: 8px;">${processInlineStyles(content.trim())}</li>`);
        continue;
      }

      if (inList) {
        flushList();
      }

      if (line.startsWith('# ')) {
        result.push(`<h1 style="font-size: ${styles.bodyFontSize + 4}pt; font-weight: 700; color: ${styles.themeColor}; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid ${styles.themeColor};">${processInlineStyles(line.slice(2).trim())}</h1>`);
        continue;
      }

      if (line.startsWith('## ')) {
        const hasBg = styles.h2BgShape !== 'none';
        const titleText = processInlineStyles(line.slice(3).trim());
        
        if (hasBg) {
          const h2BgStyles = [
            `font-size: ${styles.bodyFontSize + 2}pt;`,
            `font-weight: 700;`,
            `color: ${styles.themeColor};`,
            `margin-top: 28px;`,
            `margin-bottom: 16px;`,
            `padding: 8px 14px;`,
            `background-color: ${styles.h2BgColor};`,
            `border-radius: ${getBgShapeRadius(styles.h2BgShape)};`
          ];
          result.push(`<h2 style="${h2BgStyles.join(' ')}">${titleText}</h2>`);
        } else {
          const h2Styles = [
            `font-size: ${styles.bodyFontSize + 2}pt;`,
            `font-weight: 700;`,
            `color: ${styles.themeColor};`,
            `margin-top: 28px;`,
            `margin-bottom: 16px;`,
            `line-height: 150%;`
          ];
          const leftBar = `<span style="display: inline-block; width: 4px; height: 18px; background-color: ${styles.themeColor}; border-radius: 2px; margin-right: 10px; vertical-align: middle;"></span>`;
          result.push(`<h2 style="${h2Styles.join(' ')}">${leftBar}${titleText}</h2>`);
        }
        continue;
      }

      if (line.startsWith('### ')) {
        result.push(`<h3 style="font-size: ${styles.bodyFontSize + 1}pt; font-weight: 600; color: ${styles.themeColor}; margin-top: 20px; margin-bottom: 12px;">${processInlineStyles(line.slice(4).trim())}</h3>`);
        continue;
      }

      if (line.startsWith('> ')) {
        const quoteText = processInlineStyles(line.slice(2).trim());
        const hasBg = styles.quoteBgShape !== 'none';
        
        if (hasBg) {
          const quoteBgStyles = [
            `font-size: 14px;`,
            `color: ${styles.quoteColor};`,
            `line-height: 180%;`,
            `margin-top: 16px;`,
            `margin-bottom: 16px;`,
            `font-style: italic;`,
            `padding: 14px 16px;`,
            `background-color: ${styles.quoteBgColor};`,
            `border-radius: ${getBgShapeRadius(styles.quoteBgShape)};`
          ];
          result.push(`<blockquote style="${quoteBgStyles.join(' ')}">${quoteText}</blockquote>`);
        } else {
          const quoteStyles = [
            `font-size: 14px;`,
            `color: ${styles.quoteColor};`,
            `line-height: 180%;`,
            `margin-top: 16px;`,
            `margin-bottom: 16px;`,
            `font-style: italic;`,
            `padding: 8px 14px;`,
            `background-color: #fafafa;`,
            `border-left: 3px solid ${styles.themeColor};`
          ];
          result.push(`<blockquote style="${quoteStyles.join(' ')}">${quoteText}</blockquote>`);
        }
        continue;
      }

      if (line.startsWith('---') || line.startsWith('***')) {
        result.push(`<hr style="border: none; border-top: 1px dashed #e5e7eb; margin-top: 24px; margin-bottom: 24px;" />`);
        continue;
      }

      if (line.trim() === '') {
        continue;
      }

      result.push(`<p style="font-size: ${styles.bodyFontSize}pt; color: ${styles.bodyColor}; line-height: 200%; margin-bottom: 16px;">${processInlineStyles(line.trim())}</p>`);
    }

    flushList();
    flushTable();

    return `<div style="font-family: ${styles.bodyFont}; padding: 24px 20px;">${result.join('\n')}</div>`;
  }

  async function handleCopyHtml() {
    if (!displayContent) return;
    
    try {
      const html = convertMarkdownToWechatHtml(displayContent);
      
      if (navigator.clipboard && window.ClipboardItem) {
        const blob = new Blob([html], { type: 'text/html' });
        const item = new ClipboardItem({
          'text/html': blob,
          'text/plain': new Blob([html], { type: 'text/plain' })
        });
        await navigator.clipboard.write([item]);
      } else {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        tempDiv.style.position = 'fixed';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '-9999px';
        document.body.appendChild(tempDiv);
        
        const range = document.createRange();
        range.selectNodeContents(tempDiv);
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
        
        document.execCommand('copy');
        
        if (selection) {
          selection.removeAllRanges();
        }
        document.body.removeChild(tempDiv);
      }
      
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }

  async function normalizeContent() {
    if (!content.trim()) return;
    setIsConverting(true);
    try {
      const response = await formatApi.normalizeMarkdown(content);
      setConvertedContent(response.data.normalized_content);
    } catch (error) {
      console.error('Failed to normalize:', error);
    } finally {
      setIsConverting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin h-8 w-8 text-primary-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-none px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Type className="text-gray-800" size={20} />
            <h1 className="text-base font-semibold text-gray-900">格式处理</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Upload size={16} />
              导入样式
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".css,.json"
              onChange={handleImportCSS}
              className="hidden"
            />

            <button
              onClick={handleExportCSS}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Download size={16} />
              导出样式
            </button>

            <div className="w-px h-6 bg-gray-200 mx-1" />

            <button
              onClick={handleLoadFromLocal}
              className={clsx(
                'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors',
                saveStatus === 'loaded' ? 'bg-green-50 text-green-600' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <FolderOpen size={16} />
              {saveStatus === 'loaded' ? '已读取' : '打开文章'}
            </button>

            <div className="relative">
              <button
                onClick={() => setShowSaveMenu(!showSaveMenu)}
                disabled={!displayContent}
                className={clsx(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors',
                  saveStatus === 'saved' ? 'bg-green-50 text-green-600'
                    : saveStatus === 'error' ? 'bg-red-50 text-red-600'
                    : 'text-gray-600 hover:bg-gray-100',
                  !displayContent && 'opacity-50 cursor-not-allowed'
                )}
              >
                <Save size={16} />
                {saveStatus === 'saved' ? '已保存' : saveStatus === 'saving' ? '保存中...' : saveStatus === 'error' ? '保存失败' : '保存文章'}
                <ChevronDown size={14} className={clsx('transition-transform', showSaveMenu && 'rotate-180')} />
              </button>

              {showSaveMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-20" 
                    onClick={() => setShowSaveMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 min-w-36 py-1">
                    <button
                      onClick={() => handleSaveAs('md')}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors"
                    >
                      <FileText size={14} className="text-gray-500" />
                      <span className="text-sm text-gray-700">保存为 Markdown</span>
                    </button>
                    <button
                      onClick={() => handleSaveAs('html')}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors"
                    >
                      <FileText size={14} className="text-gray-500" />
                      <span className="text-sm text-gray-700">保存为 HTML</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="w-px h-6 bg-gray-200 mx-1" />

            <div className="relative">
              <button
                onClick={() => setShowPresetMenu(!showPresetMenu)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Palette size={16} />
                预设样式
                <ChevronDown size={14} className={clsx('transition-transform', showPresetMenu && 'rotate-180')} />
              </button>

              {showPresetMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-20" 
                    onClick={() => setShowPresetMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 min-w-40 py-1">
                    {presetThemes.map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setStyles(preset.styles);
                          setShowPresetMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors"
                      >
                        <div 
                          className="w-5 h-5 rounded-full border border-gray-200"
                          style={{ backgroundColor: preset.styles.themeColor }}
                        />
                        <span className="text-sm text-gray-700">{preset.name}</span>
                        {currentPreset?.name === preset.name && (
                          <Check size={14} className="ml-auto text-primary-500" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setShowStyleToolbar(!showStyleToolbar)}
              className={clsx(
                'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors',
                showStyleToolbar 
                  ? 'bg-primary-50 text-primary-600' 
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <Settings size={16} />
              格式编辑
              <ChevronDown size={14} className={clsx('transition-transform', showStyleToolbar && 'rotate-180')} />
            </button>

            <div className="w-px h-6 bg-gray-200 mx-1" />

            <button
              onClick={handleCopyHtml}
              disabled={!displayContent}
              className={clsx(
                'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors',
                copySuccess
                  ? 'bg-green-50 text-green-600'
                  : 'text-gray-600 hover:bg-gray-100',
                !displayContent && 'opacity-50 cursor-not-allowed'
              )}
            >
              {copySuccess ? <ClipboardCheck size={16} /> : <Copy size={16} />}
              {copySuccess ? '已复制' : '复制 HTML'}
            </button>
          </div>
        </div>

        {showStyleToolbar && (
          <div className="bg-white border-b border-gray-200 px-4 py-3">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-16">主题色</span>
                <div className="relative">
                  <button
                    onClick={() => setActiveColorPicker(activeColorPicker === 'theme' ? null : 'theme')}
                    className="w-7 h-7 rounded-lg border border-gray-300 hover:border-gray-400 transition-colors"
                    style={{ backgroundColor: styles.themeColor }}
                  />
                  {activeColorPicker === 'theme' && (
                    <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-lg p-3 shadow-lg z-40 min-w-64">
                      <div className="grid grid-cols-8 gap-1.5">
                        {colorPresets.map((color, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setStyles({ ...styles, themeColor: color });
                              setActiveColorPicker(null);
                            }}
                            className={clsx(
                              'w-6 h-6 rounded transition-transform hover:scale-110',
                              styles.themeColor === color && 'ring-2 ring-primary-500 ring-offset-1'
                            )}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <div className="mt-3 pt-2 border-t border-gray-100 flex items-center gap-2">
                        <input
                          type="color"
                          value={styles.themeColor}
                          onChange={(e) => setStyles({ ...styles, themeColor: e.target.value })}
                          className="w-7 h-7 cursor-pointer rounded border-0"
                        />
                        <input
                          type="text"
                          value={styles.themeColor}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^#[0-9a-fA-F]{0,6}$/.test(val)) {
                              setStyles({ ...styles, themeColor: val });
                            }
                          }}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded font-mono focus:outline-none focus:ring-1 focus:ring-primary-500"
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="w-px h-8 bg-gray-200" />

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-16">二级标题</span>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <span className="text-xs text-gray-400">文字</span>
                    <button
                      onClick={() => setActiveColorPicker(activeColorPicker === 'h2Color' ? null : 'h2Color')}
                      className="w-5 h-5 rounded border border-gray-300 ml-1"
                      style={{ backgroundColor: styles.h2Color }}
                    />
                    {activeColorPicker === 'h2Color' && (
                      <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-lg p-3 shadow-lg z-40 min-w-64">
                        <div className="grid grid-cols-8 gap-1.5">
                          {colorPresets.map((color, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setStyles({ ...styles, h2Color: color });
                                setActiveColorPicker(null);
                              }}
                              className={clsx(
                                'w-6 h-6 rounded transition-transform hover:scale-110',
                                styles.h2Color === color && 'ring-2 ring-primary-500 ring-offset-1'
                              )}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <div className="mt-3 pt-2 border-t border-gray-100 flex items-center gap-2">
                          <input
                            type="color"
                            value={styles.h2Color}
                            onChange={(e) => setStyles({ ...styles, h2Color: e.target.value })}
                            className="w-7 h-7 cursor-pointer rounded border-0"
                          />
                          <input
                            type="text"
                            value={styles.h2Color}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (/^#[0-9a-fA-F]{0,6}$/.test(val)) {
                                setStyles({ ...styles, h2Color: val });
                              }
                            }}
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded font-mono focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="#000000"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <span className="text-xs text-gray-400">背景</span>
                    <button
                      onClick={() => setActiveColorPicker(activeColorPicker === 'h2Bg' ? null : 'h2Bg')}
                      className="w-5 h-5 rounded border border-gray-300 ml-1"
                      style={{ backgroundColor: styles.h2BgColor }}
                    />
                    {activeColorPicker === 'h2Bg' && (
                      <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-lg p-3 shadow-lg z-40 min-w-64">
                        <div className="grid grid-cols-8 gap-1.5">
                          {colorPresets.map((color, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setStyles({ ...styles, h2BgColor: color });
                                setActiveColorPicker(null);
                              }}
                              className={clsx(
                                'w-6 h-6 rounded transition-transform hover:scale-110',
                                styles.h2BgColor === color && 'ring-2 ring-primary-500 ring-offset-1'
                              )}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <div className="mt-3 pt-2 border-t border-gray-100 flex items-center gap-2">
                          <input
                            type="color"
                            value={styles.h2BgColor}
                            onChange={(e) => setStyles({ ...styles, h2BgColor: e.target.value })}
                            className="w-7 h-7 cursor-pointer rounded border-0"
                          />
                          <input
                            type="text"
                            value={styles.h2BgColor}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (/^#[0-9a-fA-F]{0,6}$/.test(val)) {
                                setStyles({ ...styles, h2BgColor: val });
                              }
                            }}
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded font-mono focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="#000000"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-0.5">
                    {bgShapeOptions.map((shape) => {
                      const Icon = shape.icon;
                      return (
                        <button
                          key={shape.value}
                          onClick={() => setStyles({ ...styles, h2BgShape: shape.value as any })}
                          title={shape.label}
                          className={clsx(
                            'w-6 h-6 rounded flex items-center justify-center transition-colors',
                            styles.h2BgShape === shape.value 
                              ? 'bg-primary-50 text-primary-600' 
                              : 'text-gray-400 hover:text-gray-600'
                          )}
                        >
                          <Icon size={14} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="w-px h-8 bg-gray-200" />

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-16">正文字体</span>
                <select
                  value={styles.bodyFont}
                  onChange={(e) => setStyles({ ...styles, bodyFont: e.target.value })}
                  className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none"
                >
                  {fontOptions.map((font) => (
                    <option key={font.label} value={font.value}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-16">字号</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setStyles({ ...styles, bodyFontSize: Math.max(12, styles.bodyFontSize - 1) })}
                    className="w-6 h-6 rounded flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors border border-gray-300"
                  >
                    -
                  </button>
                  <span className="text-sm text-gray-700 w-8 text-center">{styles.bodyFontSize}</span>
                  <button
                    onClick={() => setStyles({ ...styles, bodyFontSize: Math.min(24, styles.bodyFontSize + 1) })}
                    className="w-6 h-6 rounded flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors border border-gray-300"
                  >
                    +
                  </button>
                  <span className="text-xs text-gray-400">pt</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-16">正文颜色</span>
                <div className="relative">
                  <button
                    onClick={() => setActiveColorPicker(activeColorPicker === 'bodyColor' ? null : 'bodyColor')}
                    className="w-5 h-5 rounded border border-gray-300"
                    style={{ backgroundColor: styles.bodyColor }}
                  />
                  {activeColorPicker === 'bodyColor' && (
                    <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-lg p-3 shadow-lg z-40 min-w-64">
                      <div className="grid grid-cols-8 gap-1.5">
                        {colorPresets.map((color, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setStyles({ ...styles, bodyColor: color });
                              setActiveColorPicker(null);
                            }}
                            className={clsx(
                              'w-6 h-6 rounded transition-transform hover:scale-110',
                              styles.bodyColor === color && 'ring-2 ring-primary-500 ring-offset-1'
                            )}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <div className="mt-3 pt-2 border-t border-gray-100 flex items-center gap-2">
                        <input
                          type="color"
                          value={styles.bodyColor}
                          onChange={(e) => setStyles({ ...styles, bodyColor: e.target.value })}
                          className="w-7 h-7 cursor-pointer rounded border-0"
                        />
                        <input
                          type="text"
                          value={styles.bodyColor}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^#[0-9a-fA-F]{0,6}$/.test(val)) {
                              setStyles({ ...styles, bodyColor: val });
                            }
                          }}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded font-mono focus:outline-none focus:ring-1 focus:ring-primary-500"
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-16">粗体颜色</span>
                <div className="relative">
                  <button
                    onClick={() => setActiveColorPicker(activeColorPicker === 'boldColor' ? null : 'boldColor')}
                    className="w-5 h-5 rounded border border-gray-300"
                    style={{ backgroundColor: styles.boldColor }}
                  />
                  {activeColorPicker === 'boldColor' && (
                    <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-lg p-3 shadow-lg z-40 min-w-64">
                      <div className="grid grid-cols-8 gap-1.5">
                        {colorPresets.map((color, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setStyles({ ...styles, boldColor: color });
                              setActiveColorPicker(null);
                            }}
                            className={clsx(
                              'w-6 h-6 rounded transition-transform hover:scale-110',
                              styles.boldColor === color && 'ring-2 ring-primary-500 ring-offset-1'
                            )}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <div className="mt-3 pt-2 border-t border-gray-100 flex items-center gap-2">
                        <input
                          type="color"
                          value={styles.boldColor}
                          onChange={(e) => setStyles({ ...styles, boldColor: e.target.value })}
                          className="w-7 h-7 cursor-pointer rounded border-0"
                        />
                        <input
                          type="text"
                          value={styles.boldColor}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^#[0-9a-fA-F]{0,6}$/.test(val)) {
                              setStyles({ ...styles, boldColor: val });
                            }
                          }}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded font-mono focus:outline-none focus:ring-1 focus:ring-primary-500"
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="w-px h-8 bg-gray-200" />

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-16">引用样式</span>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <span className="text-xs text-gray-400">文字</span>
                    <button
                      onClick={() => setActiveColorPicker(activeColorPicker === 'quoteColor' ? null : 'quoteColor')}
                      className="w-5 h-5 rounded border border-gray-300 ml-1"
                      style={{ backgroundColor: styles.quoteColor }}
                    />
                    {activeColorPicker === 'quoteColor' && (
                      <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-lg p-3 shadow-lg z-40 min-w-64">
                        <div className="grid grid-cols-8 gap-1.5">
                          {colorPresets.map((color, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setStyles({ ...styles, quoteColor: color });
                                setActiveColorPicker(null);
                              }}
                              className={clsx(
                                'w-6 h-6 rounded transition-transform hover:scale-110',
                                styles.quoteColor === color && 'ring-2 ring-primary-500 ring-offset-1'
                              )}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <div className="mt-3 pt-2 border-t border-gray-100 flex items-center gap-2">
                          <input
                            type="color"
                            value={styles.quoteColor}
                            onChange={(e) => setStyles({ ...styles, quoteColor: e.target.value })}
                            className="w-7 h-7 cursor-pointer rounded border-0"
                          />
                          <input
                            type="text"
                            value={styles.quoteColor}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (/^#[0-9a-fA-F]{0,6}$/.test(val)) {
                                setStyles({ ...styles, quoteColor: val });
                              }
                            }}
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded font-mono focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="#000000"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <span className="text-xs text-gray-400">背景</span>
                    <button
                      onClick={() => setActiveColorPicker(activeColorPicker === 'quoteBg' ? null : 'quoteBg')}
                      className="w-5 h-5 rounded border border-gray-300 ml-1"
                      style={{ backgroundColor: styles.quoteBgColor }}
                    />
                    {activeColorPicker === 'quoteBg' && (
                      <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-lg p-3 shadow-lg z-40 min-w-64">
                        <div className="grid grid-cols-8 gap-1.5">
                          {colorPresets.map((color, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setStyles({ ...styles, quoteBgColor: color });
                                setActiveColorPicker(null);
                              }}
                              className={clsx(
                                'w-6 h-6 rounded transition-transform hover:scale-110',
                                styles.quoteBgColor === color && 'ring-2 ring-primary-500 ring-offset-1'
                              )}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <div className="mt-3 pt-2 border-t border-gray-100 flex items-center gap-2">
                          <input
                            type="color"
                            value={styles.quoteBgColor}
                            onChange={(e) => setStyles({ ...styles, quoteBgColor: e.target.value })}
                            className="w-7 h-7 cursor-pointer rounded border-0"
                          />
                          <input
                            type="text"
                            value={styles.quoteBgColor}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (/^#[0-9a-fA-F]{0,6}$/.test(val)) {
                                setStyles({ ...styles, quoteBgColor: val });
                              }
                            }}
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded font-mono focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="#000000"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-0.5">
                    {bgShapeOptions.map((shape) => {
                      const Icon = shape.icon;
                      return (
                        <button
                          key={shape.value}
                          onClick={() => setStyles({ ...styles, quoteBgShape: shape.value as any })}
                          title={shape.label}
                          className={clsx(
                            'w-6 h-6 rounded flex items-center justify-center transition-colors',
                            styles.quoteBgShape === shape.value 
                              ? 'bg-primary-50 text-primary-600' 
                              : 'text-gray-400 hover:text-gray-600'
                          )}
                        >
                          <Icon size={14} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowStyleToolbar(false)}
                className="ml-auto text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}
      </header>

      {activeColorPicker && (
        <div 
          className="fixed inset-0 z-20" 
          onClick={() => setActiveColorPicker(null)}
        />
      )}

      <main className="flex-1 flex">
        <div className="w-1/2 border-r border-gray-200 flex flex-col">
          <div className="flex-1 overflow-hidden">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-full p-4 font-mono text-sm leading-relaxed resize-none outline-none bg-white focus:bg-gray-50 transition-colors"
              placeholder="输入或粘贴 Markdown 内容..."
            />
          </div>
        </div>

        <div className="w-1/2 flex flex-col bg-gray-100">
          <div className="flex-1 overflow-auto p-6 flex justify-center items-start">
            <div 
              className="bg-white shadow-lg"
              style={{ 
                width: `${IPHONE_17_WIDTH}px`,
                fontFamily: styles.bodyFont,
                padding: '24px 20px',
                minHeight: '300px'
              }}
            >
              {displayContent ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => (
                      <h1 style={{ 
                        fontSize: `${styles.bodyFontSize + 4}pt`, 
                        fontWeight: 700, 
                        color: styles.themeColor,
                        marginBottom: '20px',
                        paddingBottom: '12px',
                        borderBottom: '2px solid ' + styles.themeColor
                      }}>
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => {
                      const hasBg = styles.h2BgShape !== 'none';
                      return (
                        <h2 style={{ 
                          fontSize: `${styles.bodyFontSize + 2}pt`, 
                          fontWeight: 700, 
                          color: styles.themeColor,
                          marginTop: '28px',
                          marginBottom: '16px',
                          paddingLeft: hasBg ? '14px' : '0',
                          paddingRight: hasBg ? '14px' : '0',
                          paddingTop: hasBg ? '8px' : '0',
                          paddingBottom: hasBg ? '8px' : '0',
                          backgroundColor: hasBg ? styles.h2BgColor : 'transparent',
                          borderRadius: getBgShapeRadius(styles.h2BgShape),
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px'
                        }}>
                          <span style={{
                            width: '4px',
                            height: '18px',
                            backgroundColor: styles.themeColor,
                            borderRadius: '2px',
                            display: hasBg ? 'none' : 'block'
                          }} />
                          {children}
                        </h2>
                      );
                    },
                    h3: ({ children }) => (
                      <h3 style={{ 
                        fontSize: `${styles.bodyFontSize + 1}pt`, 
                        fontWeight: 600, 
                        color: styles.themeColor,
                        marginTop: '20px',
                        marginBottom: '12px'
                      }}>
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p style={{ 
                        fontSize: `${styles.bodyFontSize}pt`, 
                        color: styles.bodyColor,
                        lineHeight: 2,
                        marginBottom: '16px',
                        textIndent: '2em'
                      }}>
                        {children}
                      </p>
                    ),
                    ul: ({ children }) => (
                      <ul style={{ 
                        fontSize: `${styles.bodyFontSize}pt`, 
                        color: styles.bodyColor,
                        lineHeight: 2,
                        marginBottom: '16px',
                        paddingLeft: '2em',
                        listStyleType: 'disc'
                      }}>
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol style={{ 
                        fontSize: `${styles.bodyFontSize}pt`, 
                        color: styles.bodyColor,
                        lineHeight: 2,
                        marginBottom: '16px',
                        paddingLeft: '2em',
                        listStyleType: 'decimal'
                      }}>
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li style={{ marginBottom: '8px' }}>
                        {children}
                      </li>
                    ),
                    blockquote: ({ children }) => {
                      const hasBg = styles.quoteBgShape !== 'none';
                      return (
                        <blockquote style={{ 
                          fontSize: '14px', 
                          color: styles.quoteColor,
                          lineHeight: 1.8,
                          marginBottom: '16px',
                          padding: hasBg ? '14px 16px' : '8px 14px',
                          backgroundColor: hasBg ? styles.quoteBgColor : '#fafafa',
                          borderRadius: hasBg ? getBgShapeRadius(styles.quoteBgShape) : '0',
                          borderLeft: hasBg ? 'none' : '3px solid ' + styles.themeColor,
                          fontStyle: 'italic'
                        }}>
                          {children}
                        </blockquote>
                      );
                    },
                    code: ({ className, children, ...props }) => {
                      const match = /language-(\w+)/.exec(className || '');
                      const isInline = !match;
                      return isInline ? (
                        <code style={{ 
                          backgroundColor: '#f3f4f6',
                          color: '#ef4444',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontFamily: 'Consolas, Monaco, monospace',
                          fontSize: '13px'
                        }} {...props}>
                          {children}
                        </code>
                      ) : (
                        <pre style={{
                          backgroundColor: '#1f2937',
                          color: '#e5e7eb',
                          padding: '16px',
                          borderRadius: '8px',
                          overflowX: 'auto',
                          marginBottom: '16px',
                          fontSize: '13px',
                          lineHeight: 1.6,
                          fontFamily: 'Consolas, Monaco, monospace'
                        }}>
                          <code>{children}</code>
                        </pre>
                      );
                    },
                    a: ({ href, children }) => (
                      <a href={href} style={{ 
                        color: styles.themeColor,
                        textDecoration: 'underline'
                      }}>
                        {children}
                      </a>
                    ),
                    strong: ({ children }) => (
                      <strong style={{ 
                        fontWeight: 700,
                        color: styles.boldColor
                      }}>
                        {children}
                      </strong>
                    ),
                    em: ({ children }) => (
                      <em style={{ fontStyle: 'italic' }}>
                        {children}
                      </em>
                    ),
                    hr: () => (
                      <hr style={{ 
                        border: 'none',
                        borderTop: '1px dashed #e5e7eb',
                        margin: '24px 0'
                      }} />
                    ),
                    br: () => <br />,
                    img: ({ src, alt }) => (
                      <img 
                        src={src} 
                        alt={alt || ''} 
                        style={{
                          maxWidth: '100%',
                          height: 'auto',
                          borderRadius: '8px',
                          margin: '16px 0'
                        }}
                      />
                    ),
                    table: ({ children }) => (
                      <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
                        <table style={{
                          width: '100%',
                          borderCollapse: 'collapse',
                          fontSize: '14px'
                        }}>
                          {children}
                        </table>
                      </div>
                    ),
                    thead: ({ children }) => (
                      <thead style={{ backgroundColor: styles.h2BgColor }}>
                        {children}
                      </thead>
                    ),
                    th: ({ children }) => (
                      <th style={{
                        border: '1px solid #e5e7eb',
                        padding: '10px 12px',
                        textAlign: 'left',
                        fontWeight: 600,
                        color: styles.themeColor
                      }}>
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td style={{
                        border: '1px solid #e5e7eb',
                        padding: '10px 12px',
                        color: styles.bodyColor
                      }}>
                        {children}
                      </td>
                    ),
                  }}
                >
                  {displayContent}
                </ReactMarkdown>
              ) : (
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  minHeight: '200px',
                  color: '#9ca3af'
                }}>
                  <FileText size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                  <p style={{ fontSize: '14px' }}>暂无内容</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
