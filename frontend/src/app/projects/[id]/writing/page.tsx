'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { writingApi, projectsApi } from '@/lib/api/client';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
import { 
  Sparkles, 
  Loader2,
  TrendingUp,
  MessageSquare,
  Wand2,
  RefreshCw,
  ChevronDown,
  Copy,
  Check,
  AlertCircle
} from 'lucide-react';
import { clsx } from 'clsx';

const writingStyles = [
  { id: 'professional', label: '正式专业', description: '适合商务和专业文章' },
  { id: 'casual', label: '轻松随意', description: '适合博客和社交媒体' },
  { id: 'conversational', label: '对话式', description: '像和朋友聊天一样' },
  { id: 'academic', label: '学术严谨', description: '适合论文和研究报告' },
  { id: 'poetic', label: '诗意优美', description: '富有文学性' },
  { id: 'humorous', label: '幽默风趣', description: '轻松活泼' },
];

export default function WritingPage() {
  const params = useParams();
  const { currentProject, setCurrentStep } = useAppStore();
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isAIAction, setIsAIAction] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const [aiResult, setAiResult] = useState<{
    action: string;
    original: string;
    result: string;
    showCompare: boolean;
  } | null>(null);

  const [aiTasteResult, setAiTasteResult] = useState<any>(null);
  const [isAnalyzingAITaste, setIsAnalyzingAITaste] = useState(false);

  const [selectedStyle, setSelectedStyle] = useState('professional');
  const [showStyleDropdown, setShowStyleDropdown] = useState(false);

  useEffect(() => {
    setCurrentStep(5);
    loadContent();
  }, []);

  async function loadContent() {
    if (!params.id) return;
    try {
      const response = await projectsApi.getContents(params.id as string, 5);
      if (response.data.length > 0) {
        setContent(response.data[0].content);
      }
    } catch (error) {
      console.error('Failed to load content:', error);
    }
  }

  async function handleSave() {
    if (!params.id || !content.trim()) return;
    
    try {
      setIsSaving(true);
      await projectsApi.createContent(params.id as string, {
        step: 5,
        content: content,
        contentType: 'markdown'
      });
      setLastSaved(new Date());
      
      if (currentProject) {
        const wordCount = content.trim().split(/\s+|[\u4e00-\u9fa5]|[\n\r]/).filter(Boolean).length;
        await projectsApi.update(currentProject._id, {
          wordCount,
          currentStep: 5
        });
      }
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  }

  const debouncedSave = useCallback(() => {
    const timer = setTimeout(() => {
      handleSave();
    }, 2000);
    return () => clearTimeout(timer);
  }, [content, params.id, currentProject]);

  useEffect(() => {
    if (content.length > 0) {
      const cleanup = debouncedSave();
      return cleanup;
    }
  }, [content, debouncedSave]);

  async function handleAIAction(action: string, selection?: string) {
    if (selection && !aiResult) {
      setAiResult({
        action,
        original: selection,
        result: '',
        showCompare: false
      });
    }
    
    setIsAIAction(true);
    
    try {
      let response;
      const textToProcess = selection || content;
      
      switch (action) {
        case 'continue':
          response = await writingApi.continue(textToProcess);
          const continuation = response.data.continuation;
          setContent(prev => prev + continuation);
          break;
          
        case 'polish':
          response = await writingApi.polish(textToProcess, selectedStyle);
          if (selection) {
            setAiResult(prev => prev ? {
              ...prev,
              result: response.data.polished_content,
              showCompare: true
            } : null);
          } else {
            setContent(response.data.polished_content);
          }
          break;
          
        case 'expand':
          response = await writingApi.expand(textToProcess, 500);
          if (selection) {
            setAiResult(prev => prev ? {
              ...prev,
              result: response.data.expanded_content,
              showCompare: true
            } : null);
          } else {
            setContent(response.data.expanded_content);
          }
          break;
          
        case 'shorten':
          response = await writingApi.shorten(textToProcess, 0.5);
          if (selection) {
            setAiResult(prev => prev ? {
              ...prev,
              result: response.data.shortened_content,
              showCompare: true
            } : null);
          } else {
            setContent(response.data.shortened_content);
          }
          break;
          
        case 'rewrite':
          response = await writingApi.rewrite(textToProcess, selectedStyle);
          if (selection) {
            setAiResult(prev => prev ? {
              ...prev,
              result: response.data.rewritten_content,
              showCompare: true
            } : null);
          } else {
            setContent(response.data.rewritten_content);
          }
          break;
      }
    } catch (error) {
      console.error('AI action failed:', error);
    } finally {
      setIsAIAction(false);
    }
  }

  async function handleAnalyzeAITaste() {
    if (!content.trim()) return;
    
    setIsAnalyzingAITaste(true);
    try {
      const response = await writingApi.analyzeAITaste(content);
      setAiTasteResult(response.data);
    } catch (error) {
      console.error('AI taste analysis failed:', error);
    } finally {
      setIsAnalyzingAITaste(false);
    }
  }

  function applyAIResult() {
    if (!aiResult) return;
    
    setContent(prev => {
      return prev.replace(aiResult.original, aiResult.result);
    });
    setAiResult(null);
  }

  const getAITasteColor = (score: number) => {
    if (score < 30) return 'text-green-600 bg-green-100';
    if (score < 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getAITasteLabel = (score: number) => {
    if (score < 30) return 'AI味低';
    if (score < 50) return 'AI味中等';
    return 'AI味高';
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="text-primary-500" size={20} />
              写出草稿
            </h2>
            
            {lastSaved && (
              <span className="text-sm text-gray-500">
                上次保存: {lastSaved.toLocaleTimeString('zh-CN')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowStyleDropdown(!showStyleDropdown)}
                className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                <Wand2 size={16} className="text-gray-500" />
                {writingStyles.find(s => s.id === selectedStyle)?.label}
                <ChevronDown size={16} className="text-gray-400" />
              </button>
              
              {showStyleDropdown && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
                  {writingStyles.map(style => (
                    <button
                      key={style.id}
                      onClick={() => {
                        setSelectedStyle(style.id);
                        setShowStyleDropdown(false);
                      }}
                      className={clsx(
                        'w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors',
                        selectedStyle === style.id && 'bg-primary-50 text-primary-700'
                      )}
                    >
                      <p className="font-medium text-sm">{style.label}</p>
                      <p className="text-xs text-gray-500">{style.description}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleAnalyzeAITaste}
              disabled={isAnalyzingAITaste || !content.trim()}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {isAnalyzingAITaste ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <TrendingUp size={16} className="text-gray-500" />
              )}
              AI味检测
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving || !content.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 text-sm"
            >
              {isSaving ? (
                <Loader2 className="animate-spin" size={16} />
              ) : null}
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <MarkdownEditor
            value={content}
            onChange={setContent}
            onSave={handleSave}
            isSaving={isSaving}
            onAIAction={handleAIAction}
            minHeight={500}
            placeholder="开始撰写您的文章..."
          />

          {isAIAction && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-8 text-center">
                <Loader2 className="animate-spin h-12 w-12 text-primary-500 mx-auto mb-4" />
                <p className="text-gray-700 font-medium">AI 正在处理...</p>
                <p className="text-gray-500 text-sm mt-1">请稍候</p>
              </div>
            </div>
          )}

          {aiResult && aiResult.showCompare && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <MessageSquare size={20} className="text-primary-500" />
                  AI 处理结果
                </h3>
                <button
                  onClick={() => setAiResult(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">原文</h4>
                  <div className="bg-gray-50 rounded-lg p-4 text-sm whitespace-pre-wrap">
                    {aiResult.original}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-primary-600 mb-2">AI 修改后</h4>
                  <div className="bg-primary-50 rounded-lg p-4 text-sm whitespace-pre-wrap border border-primary-200">
                    {aiResult.result || '处理中...'}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setAiResult(null)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={applyAIResult}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  <Check size={16} />
                  应用修改
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {aiTasteResult && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp size={18} className="text-primary-500" />
                AI 味检测结果
              </h3>
              
              <div className="text-center mb-4">
                <span className={clsx(
                  'inline-flex items-center justify-center w-20 h-20 rounded-full text-2xl font-bold',
                  getAITasteColor(aiTasteResult.score || 0)
                )}>
                  {aiTasteResult.score || 0}%
                </span>
                <p className="mt-2 text-sm font-medium">
                  {getAITasteLabel(aiTasteResult.score || 0)}
                </p>
              </div>

              {aiTasteResult.dimensions && (
                <div className="space-y-3">
                  {Object.entries(aiTasteResult.dimensions).map(([key, value]: [string, number]) => (
                    <div key={key}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">
                          {key === 'connector_ratio' ? '连接词比率' :
                           key === 'cliche_ratio' ? '套话占比' :
                           key === 'sentence_variety' ? '句式多样性' :
                           key === 'emotion_naturalness' ? '情感自然度' : key}
                        </span>
                        <span className="font-medium">{value}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={clsx(
                            'h-2 rounded-full transition-all',
                            value > 50 ? 'bg-red-500' : value > 30 ? 'bg-yellow-500' : 'bg-green-500'
                          )}
                          style={{ width: `${value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {aiTasteResult.suggestions && aiTasteResult.suggestions.length > 0 && (
                <div className="mt-4 p-3 bg-amber-50 rounded-lg">
                  <h4 className="text-sm font-medium text-amber-700 mb-2 flex items-center gap-1">
                    <AlertCircle size={14} />
                    改进建议
                  </h4>
                  <ul className="text-sm text-amber-800 space-y-1">
                    {aiTasteResult.suggestions.map((suggestion: string, index: number) => (
                      <li key={index}>• {suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">AI 快捷工具</h3>
            
            <div className="space-y-2">
              <button
                onClick={() => handleAIAction('continue')}
                disabled={!content.trim()}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="flex items-center gap-2 text-sm">
                  <Sparkles size={16} className="text-primary-500" />
                  AI 续写
                </span>
                <span className="text-xs text-gray-500 block mt-1">在当前位置继续写作</span>
              </button>

              <button
                onClick={() => handleAIAction('rewrite')}
                disabled={!content.trim()}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="flex items-center gap-2 text-sm">
                  <Wand2 size={16} className="text-amber-500" />
                  风格转换
                </span>
                <span className="text-xs text-gray-500 block mt-1">转换为选择的风格</span>
              </button>

              <button
                onClick={() => handleAIAction('shorten')}
                disabled={!content.trim()}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="flex items-center gap-2 text-sm">
                  <Copy size={16} className="text-blue-500" />
                  精简内容
                </span>
                <span className="text-xs text-gray-500 block mt-1">压缩到约50%长度</span>
              </button>

              <button
                onClick={() => handleAIAction('expand')}
                disabled={!content.trim()}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="flex items-center gap-2 text-sm">
                  <RefreshCw size={16} className="text-green-500" />
                  扩展内容
                </span>
                <span className="text-xs text-gray-500 block mt-1">增加细节和例子</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">快捷键</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">粗体</span>
                <kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs">Ctrl + B</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">斜体</span>
                <kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs">Ctrl + I</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">链接</span>
                <kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs">Ctrl + K</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">保存</span>
                <kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs">自动保存</kbd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
