'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { formatApi } from '@/lib/api/client';
import type { Platform } from '@/types';
import { 
  Format, 
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
  FileJson,
  FileType,
  Code
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
  { id: 'word', label: 'Word', icon: FileType },
  { id: 'pdf', label: 'PDF', icon: FileJson },
  { id: 'plaintext', label: '纯文本', icon: FileText },
];

export default function FormatPage() {
  const params = useParams();
  const { currentProject, setCurrentStep } = useAppStore();
  const [content, setContent] = useState('# 示例文章\n\n这是一篇示例文章的内容。\n\n## 第一部分\n\n这里是第一部分的内容。\n\n## 第二部分\n\n这里是第二部分的内容。');
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [convertedContent, setConvertedContent] = useState<string>('');
  const [isConverting, setIsConverting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setCurrentStep(7);
    loadPlatforms();
  }, []);

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
      const response = await formatApi.convert(content, platformId);
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
      const response = await formatApi.normalizeMarkdown(content);
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
        convertedContent || content, 
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
    const text = convertedContent || content;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Format className="text-primary-500" size={24} />
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center border-b border-gray-200">
              <button
                onClick={() => setConvertedContent('')}
                className={clsx(
                  'flex-1 py-3 text-sm font-medium transition-colors',
                  !convertedContent 
                    ? 'bg-gray-50 text-primary-600 border-b-2 border-primary-500' 
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                原始内容
              </button>
              {convertedContent && (
                <button
                  onClick={() => {}}
                  className={clsx(
                    'flex-1 py-3 text-sm font-medium transition-colors',
                    convertedContent 
                      ? 'bg-gray-50 text-primary-600 border-b-2 border-primary-500' 
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  转换结果
                </button>
              )}
            </div>
            
            <div className="p-4">
              <textarea
                value={convertedContent || content}
                onChange={(e) => {
                  if (!convertedContent) {
                    setContent(e.target.value);
                  } else {
                    setConvertedContent(e.target.value);
                  }
                }}
                className="w-full h-96 p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none font-mono text-sm leading-relaxed resize-none"
                placeholder="输入或粘贴您的文章内容..."
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">快速工具</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={normalizeMarkdown}
                disabled={isConverting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors disabled:opacity-50 text-sm"
              >
                {isConverting ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                规范化 Markdown
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">平台适配</h3>
            <div className="space-y-2">
              {platforms.map((platform) => {
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
              })}
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
                  <p className="text-gray-500 text-xs">结构清晰，使用 Markdown 标题层级，引用使用 &gt;</p>
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
