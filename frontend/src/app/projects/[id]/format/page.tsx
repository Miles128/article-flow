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
  Check
} from 'lucide-react';
import { clsx } from 'clsx';

interface StyleConfig {
  themeColor: string;
  h2Color: string;
  h2BgColor: string;
  h2BgShape: 'none' | 'square' | 'rounded' | 'pill';
  bodyFont: string;
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
  bodyColor: '#374151',
  boldColor: '#111827',
  quoteColor: '#6b7280',
  quoteBgColor: '#f9fafb',
  quoteBgShape: 'rounded',
};

const colorPresets = [
  '#0ea5e9', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  '#111827', '#1f2937', '#374151', '#4b5563',
  '#6b7280', '#9ca3af', '#0369a1', '#065f46',
  '#92400e', '#991b1b', '#5b21b6', '#9d174d',
  '#f0f9ff', '#f0fdf4', '#fffbeb', '#fef2f2',
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
    name: '清新蓝', 
    styles: { ...defaultStyles, themeColor: '#0ea5e9', h2BgColor: '#f0f9ff', h2Color: '#0369a1' } 
  },
  { 
    name: '活力橙', 
    styles: { ...defaultStyles, themeColor: '#f59e0b', h2BgColor: '#fffbeb', h2Color: '#92400e' } 
  },
  { 
    name: '自然绿', 
    styles: { ...defaultStyles, themeColor: '#10b981', h2BgColor: '#f0fdf4', h2Color: '#065f46' } 
  },
  { 
    name: '优雅紫', 
    styles: { ...defaultStyles, themeColor: '#8b5cf6', h2BgColor: '#faf5ff', h2Color: '#5b21b6' } 
  },
  { 
    name: '商务灰', 
    styles: { ...defaultStyles, themeColor: '#4b5563', h2BgColor: '#f3f4f6', h2Color: '#1f2937', bodyColor: '#4b5563' } 
  },
  { 
    name: '简约白', 
    styles: { 
      ...defaultStyles, 
      themeColor: '#111827', 
      h2BgColor: '#ffffff', 
      h2Color: '#111827',
      h2BgShape: 'none',
      quoteBgColor: '#ffffff',
      quoteBgShape: 'none'
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
  const [styles, setStyles] = useState<StyleConfig>(defaultStyles);
  const [isConverting, setIsConverting] = useState(false);
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
                    <span className="text-xs text-gray-400">字</span>
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
                    <span className="text-xs text-gray-400">底</span>
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
                    <span className="text-xs text-gray-400">字</span>
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
                    <span className="text-xs text-gray-400">底</span>
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
          className="fixed inset-0 z-30" 
          onClick={() => setActiveColorPicker(null)}
        />
      )}

      <main className="flex-1 flex">
        <div className="w-3/5 border-r border-gray-200 flex flex-col">
          <div className="flex-1 overflow-hidden">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-full p-4 font-mono text-sm leading-relaxed resize-none outline-none bg-white focus:bg-gray-50 transition-colors"
              placeholder="输入或粘贴 Markdown 内容..."
            />
          </div>
        </div>

        <div className="w-2/5 flex flex-col bg-gray-100">
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
                        fontSize: '20px', 
                        fontWeight: 700, 
                        color: styles.boldColor,
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
                          fontSize: '17px', 
                          fontWeight: 700, 
                          color: styles.h2Color,
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
                        fontSize: '16px', 
                        fontWeight: 600, 
                        color: styles.h2Color,
                        marginTop: '20px',
                        marginBottom: '12px'
                      }}>
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p style={{ 
                        fontSize: '15px', 
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
                        fontSize: '15px', 
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
                        fontSize: '15px', 
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
                        color: styles.h2Color
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
