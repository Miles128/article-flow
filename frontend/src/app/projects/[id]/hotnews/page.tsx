'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { hotnewsApi } from '@/lib/api/client';
import { 
  TrendingUp, 
  Search, 
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  X,
  Target,
  Users,
  Hash,
  Newspaper,
  ExternalLink,
  Lightbulb,
  BarChart3
} from 'lucide-react';
import { clsx } from 'clsx';

interface MinedTopic {
  title: string;
  angle: string;
  newsValue?: string;
  potentialAudience?: string;
  searchKeywords?: string[];
  tags: string[];
}

interface SearchLink {
  keyword: string;
  platforms: { name: string; url: string }[];
}

export default function HotnewsPage() {
  const params = useParams();
  const { setCurrentStep, llmConfig } = useAppStore();
  
  const [miningKeywords, setMiningKeywords] = useState('');
  const [miningCount, setMiningCount] = useState(8);
  const [miningResult, setMiningResult] = useState<{ topics: MinedTopic[]; keywordsUsed?: string[] } | null>(null);
  const [miningLoading, setMiningLoading] = useState(false);
  const [miningError, setMiningError] = useState<string | null>(null);
  const [expandedTopic, setExpandedTopic] = useState<number | null>(null);
  
  const [searchLinks, setSearchLinks] = useState<SearchLink[]>([]);
  const [generatingLinks, setGeneratingLinks] = useState(false);

  useEffect(() => {
    setCurrentStep(1);
  }, []);

  async function handleMineTopics() {
    if (!llmConfig.apiKey) {
      setMiningError('请先配置 LLM API Key（点击侧边栏的「LLM 设置」按钮）');
      return;
    }

    setMiningLoading(true);
    setMiningError(null);
    setMiningResult(null);
    setSearchLinks([]);

    try {
      const keywords = miningKeywords
        .split(/[,，\s]+/)
        .map(k => k.trim())
        .filter(k => k.length > 0);

      const response = await hotnewsApi.mineTopics({
        keywords: keywords.length > 0 ? keywords : undefined,
        count: miningCount,
        llmConfig: {
          apiKey: llmConfig.apiKey,
          baseUrl: llmConfig.baseUrl,
          modelName: llmConfig.modelName,
          temperature: llmConfig.temperature,
        },
      });

      setMiningResult(response.data);
    } catch (error: any) {
      setMiningError(error.response?.data?.error || error.message || '挖掘失败，请稍后重试');
    } finally {
      setMiningLoading(false);
    }
  }

  async function handleGenerateSearchLinks(keywords: string[]) {
    if (!keywords || keywords.length === 0) return;
    
    setGeneratingLinks(true);
    try {
      const response = await hotnewsApi.generateSearchLinks({ keywords });
      setSearchLinks(response.data.searchLinks || []);
    } catch (error) {
      console.error('Failed to generate search links:', error);
    } finally {
      setGeneratingLinks(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary-100 rounded-lg">
            <Sparkles className="text-primary-600" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">智能选题挖掘</h2>
            <p className="text-gray-500 text-sm mt-0.5">输入选题方向关键词，AI 帮你挖掘有新闻价值的选题</p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              选题方向关键词（可选，多个用逗号/空格分隔）
            </label>
            <input
              type="text"
              value={miningKeywords}
              onChange={(e) => setMiningKeywords(e.target.value)}
              placeholder="例如：AI, 人工智能, 大模型, 新能源汽车"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  handleMineTopics();
                }
              }}
            />
            <p className="text-xs text-gray-500 mt-1">
              留空则由 AI 基于当前热点趋势生成综合选题
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              生成选题数量：{miningCount} 个
            </label>
            <input
              type="range"
              min="5"
              max="10"
              value={miningCount}
              onChange={(e) => setMiningCount(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>5个</span>
              <span>10个</span>
            </div>
          </div>

          {!llmConfig.apiKey && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>请先配置 LLM API Key，点击侧边栏的「LLM 设置」按钮</span>
            </div>
          )}

          {miningError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{miningError}</span>
                <button
                  onClick={() => setMiningError(null)}
                  className="ml-2 text-red-500 hover:text-red-700"
                >
                  <X size={14} className="inline" />
                </button>
              </div>
            </div>
          )}

          <button
            onClick={handleMineTopics}
            disabled={miningLoading || !llmConfig.apiKey}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-base"
          >
            {miningLoading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                AI 分析中...
              </>
            ) : (
              <>
                <Sparkles size={20} />
                开始智能挖掘
              </>
            )}
          </button>
        </div>
      </div>

      {miningResult?.topics && miningResult.topics.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="text-primary-500" size={20} />
              <h3 className="text-lg font-semibold text-gray-900">
                挖掘结果 ({miningResult.topics.length} 个选题)
              </h3>
            </div>
            {miningResult.keywordsUsed && miningResult.keywordsUsed.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">基于关键词：</span>
                {miningResult.keywordsUsed.map((kw, i) => (
                  <span key={i} className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded text-xs font-medium">
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            {miningResult.topics.map((topic, index) => (
              <div 
                key={index}
                className={clsx(
                  'bg-white rounded-xl border transition-all',
                  expandedTopic === index
                    ? 'border-primary-300 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                )}
              >
                <div 
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedTopic(expandedTopic === index ? null : index)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className={clsx(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5',
                        index < 3 ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'
                      )}>
                        {index + 1}
                      </span>
                      <div>
                        <h4 className="font-semibold text-gray-900 leading-relaxed">
                          {topic.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {topic.tags?.slice(0, 3).map((tag, i) => (
                            <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {topic.searchKeywords && topic.searchKeywords.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGenerateSearchLinks(topic.searchKeywords || []);
                          }}
                          className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
                          title="生成搜索链接"
                        >
                          <Search size={18} />
                        </button>
                      )}
                      {expandedTopic === index ? (
                        <ChevronUp size={18} className="text-gray-400" />
                      ) : (
                        <ChevronDown size={18} className="text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {expandedTopic === index && (
                  <div className="px-4 pb-4 pt-2 border-t border-gray-100 space-y-4">
                    {topic.angle && (
                      <div>
                        <div className="flex items-center gap-1.5 text-gray-600 text-sm font-medium mb-1.5">
                          <Lightbulb size={14} />
                          <span>切入角度</span>
                        </div>
                        <p className="text-gray-700 text-sm leading-relaxed pl-5">
                          {topic.angle}
                        </p>
                      </div>
                    )}

                    {topic.newsValue && (
                      <div>
                        <div className="flex items-center gap-1.5 text-gray-600 text-sm font-medium mb-1.5">
                          <BarChart3 size={14} />
                          <span>新闻价值</span>
                        </div>
                        <p className="text-gray-700 text-sm leading-relaxed pl-5">
                          {topic.newsValue}
                        </p>
                      </div>
                    )}

                    {topic.potentialAudience && (
                      <div>
                        <div className="flex items-center gap-1.5 text-gray-600 text-sm font-medium mb-1.5">
                          <Users size={14} />
                          <span>目标受众</span>
                        </div>
                        <p className="text-gray-700 text-sm leading-relaxed pl-5">
                          {topic.potentialAudience}
                        </p>
                      </div>
                    )}

                    {topic.searchKeywords && topic.searchKeywords.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 text-gray-600 text-sm font-medium mb-1.5">
                          <Hash size={14} />
                          <span>建议搜索关键词</span>
                        </div>
                        <div className="flex flex-wrap gap-2 pl-5">
                          {topic.searchKeywords.map((kw, i) => (
                            <button
                              key={i}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGenerateSearchLinks([kw]);
                              }}
                              className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-full text-sm transition-colors"
                            >
                              {kw}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {searchLinks.length > 0 && (
        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Newspaper className="text-primary-500" size={20} />
              <h3 className="text-lg font-semibold text-gray-900">搜索链接</h3>
            </div>
            <button
              onClick={() => setSearchLinks([])}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X size={18} />
            </button>
          </div>

          {generatingLinks && (
            <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
              <Loader2 className="animate-spin" size={16} />
              生成搜索链接中...
            </div>
          )}

          <div className="space-y-4">
            {searchLinks.map((item, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                  <Search size={14} className="text-gray-500" />
                  {item.keyword}
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.platforms.map((platform, i) => (
                    <a
                      key={i}
                      href={platform.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700 transition-colors"
                    >
                      {platform.name}
                      <ExternalLink size={12} />
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-500 mt-4 text-center">
            点击链接在新标签页中搜索，查找相关新闻和资料
          </p>
        </div>
      )}
    </div>
  );
}
