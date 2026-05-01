'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { formatApi, projectsApi } from '@/lib/api/client';
import type { Platform } from '@/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Type, 
  FileText,
  MessageCircle,
  BookOpen,
  BookMarked,
  Video,
  Newspaper,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Download,
  Code,
  Smartphone
} from 'lucide-react';
import { clsx } from 'clsx';

const platformIcons: Record<string, React.ElementType> = {
  wechat: MessageCircle,
  zhihu: BookOpen,
  xiaohongshu: BookMarked,
  bilibili: Video,
  jianshu: FileText,
  toutiao: Newspaper,
};

const exportFormats = [
  { id: 'html', label: 'HTML', icon: Code },
  { id: 'word', label: 'Word', icon: FileText },
  { id: 'pdf', label: 'PDF', icon: FileText },
  { id: 'plaintext', label: '纯文本', icon: FileText },
];

export default function FormatPage() {
  const params = useParams();
  const { currentProject, setCurrentStep } = useAppStore();
  const [content, setContent] = useState('');
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('wechat');
  const [convertedContent, setConvertedContent] = useState<string>('');
  const [isConverting, setIsConverting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setCurrentStep(7);
    loadContent();
    loadPlatforms();
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

  async function loadPlatforms() {
    try {
      const response = await formatApi.getPlatforms();
      setPlatforms(response.data);
    } catch (error) {
      console.error('Failed to load platforms:', error);
    }
  }

  async function convertToPlatform(platformId: string) {
    setSelectedPlatform(platformId);
    setIsConverting(true);
    
    try {
      const response = await formatApi.convert(content || '', platformId);
      setConvertedContent(response.data.converted_content);
    } catch (error) {
      console.error('Failed to convert format:', error);
    } finally {
      setIsConverting(false);
    }
  }

  async function normalizeMarkdown() {
    setIsConverting(true);
    try {
      const response = await formatApi.normalizeMarkdown(content || '');
      setConvertedContent(response.data.normalized_content);
    } catch (error) {
      console.error('Failed to normalize:', error);
    } finally {
      setIsConverting(false);
    }
  }

  async function exportToFormat(formatId: string) {
    setIsExporting(true);
    try {
      const response = await formatApi.export(
        convertedContent || content || '', 
        formatId, 
        currentProject?.title || '文章'
      );
      
      if (formatId === 'html' && response.data.content) {
        const blob = new Blob([response.data.content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.data.filename || 'article.html';
        a.click();
        URL.revokeObjectURL(url);
      }
      
      alert(`已导出为 ${formatId.toUpperCase()} 格式`);
    } catch (error) {
      console.error('Failed to export:', error);
      alert('导出失败');
    } finally {
      setIsExporting(false);
    }
  }

  function copyToClipboard() {
    const text = convertedContent || content || '';
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const displayContent = convertedContent || content || '';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin h-8 w-8 text-primary-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Type className="text-primary-500" size={24} />
              格式处理
            </h2>
            <p className="text-gray-500 mt-1">Markdown 规范化、多平台格式适配、一键转换导出</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={copyToClipboard}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
              {copied ? '已复制' : '复制'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center border-b border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex-1 flex items-center gap-2">
                <FileText size={16} className="text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Markdown 原始内容</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={normalizeMarkdown}
                  disabled={isConverting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors disabled:opacity-50 text-xs"
                >
                  {isConverting ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />}
                  规范化
                </button>
              </div>
            </div>
            
            <div className="p-4">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-96 p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none font-mono text-sm leading-relaxed resize-none bg-gray-50"
                placeholder="暂无内容，请先完成写作步骤..."
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center border-b border-gray-200 bg-gray-50 px-4 py-3">
              <Smartphone size={16} className="text-gray-500 mr-2" />
              <span className="text-sm font-medium text-gray-700">微信公众号预览</span>
            </div>
            
            <div className="p-4 flex justify-center">
              <div className="w-64 bg-white rounded-3xl shadow-2xl overflow-hidden border-8 border-gray-800" style={{ aspectRatio: '9/19' }}>
                <div className="bg-gray-900 px-4 py-2 flex items-center justify-between">
                  <span className="text-white text-xs">9:41</span>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-2 bg-white rounded-sm" />
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                </div>
                
                <div className="bg-gray-100 px-3 py-2 flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <MessageCircle size={14} className="text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-800">公众号</span>
                </div>
                
                <div className="bg-white overflow-y-auto" style={{ height: 'calc(100% - 88px)' }}>
                  <div className="p-4">
                    {displayContent ? (
                      <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({ children }) => <h1 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-200">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-base font-bold text-gray-900 mt-4 mb-2 flex items-center gap-2">
                              <span className="w-1 h-4 bg-primary-500 rounded-full" />
                              {children}
                            </h2>,
                            h3: ({ children }) => <h3 className="text-sm font-semibold text-gray-800 mt-3 mb-1.5">{children}</h3>,
                            p: ({ children }) => <p className="text-sm text-gray-700 mb-3 leading-relaxed indent-2">{children}</p>,
                            ul: ({ children }) => <ul className="text-sm text-gray-700 mb-3 pl-4 space-y-1.5 list-disc">{children}</ul>,
                            ol: ({ children }) => <ol className="text-sm text-gray-700 mb-3 pl-4 space-y-1.5 list-decimal">{children}</ol>,
                            li: ({ children }) => <li className="text-sm text-gray-700">{children}</li>,
                            blockquote: ({ children }) => <blockquote className="border-l-2 border-primary-400 pl-3 my-3 text-sm text-gray-600 italic bg-primary-50 py-2 pr-2 rounded-r">{children}</blockquote>,
                            code: ({ children }) => <code className="bg-gray-100 text-red-600 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
                            a: ({ href, children }) => <a href={href} className="text-primary-600 underline text-sm">{children}</a>,
                            strong: ({ children }) => <strong className="font-bold text-gray-900">{children}</strong>,
                            em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
                            hr: () => <hr className="my-4 border-gray-200 border-dashed" />,
                            br: () => <br />,
                          }}
                        >
                          {displayContent}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                        <FileText size={32} className="mb-2 opacity-50" />
                        <p className="text-sm">暂无预览内容</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">平台适配</h3>
            <div className="space-y-2">
              {platforms.length > 0 ? platforms.map((platform) => {
                const Icon = platformIcons[platform.id] || FileText;
                return (
                  <button
                    key={platform.id}
                    onClick={() => convertToPlatform(platform.id)}
                    disabled={isConverting}
                    className={clsx(
                      'w-full text-left px-4 py-3 rounded-lg border-2 transition-all disabled:opacity-50',
                      selectedPlatform === platform.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={20} className={clsx(
                        selectedPlatform === platform.id ? 'text-primary-600' : 'text-gray-400'
                      )} />
                      <div>
                        <p className={clsx(
                          'font-medium text-sm',
                          selectedPlatform === platform.id ? 'text-primary-700' : 'text-gray-900'
                        )}>
                          {platform.name}
                        </p>
                        <p className="text-xs text-gray-500">{platform.description}</p>
                      </div>
                    </div>
                  </button>
                );
              }) : (
                <p className="text-sm text-gray-500 text-center py-4">暂无平台配置</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">导出格式</h3>
            <div className="grid grid-cols-2 gap-2">
              {exportFormats.map((format) => {
                const Icon = format.icon;
                return (
                  <button
                    key={format.id}
                    onClick={() => exportToFormat(format.id)}
                    disabled={isExporting}
                    className="flex flex-col items-center gap-2 px-3 py-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-primary-300 transition-all disabled:opacity-50"
                  >
                    <Icon size={24} className="text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">{format.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">格式提示</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <MessageCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-700">公众号</p>
                  <p className="text-gray-500 text-xs">段落≤150字，对话式风格，适当使用 emoji</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <BookOpen size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-700">知乎</p>
                  <p className="text-gray-500 text-xs">结构清晰，使用 Markdown 标题层级</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <BookMarked size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-700">小红书</p>
                  <p className="text-gray-500 text-xs">段落极短，添加话题标签 #，使用表情符号分隔</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
