'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { hotnewsApi } from '@/lib/api/client';
import type { HotNewsItem, HotNewsResult } from '@/types';
import { 
  TrendingUp, 
  Search, 
  RefreshCw, 
  ExternalLink,
  Plus,
  MessageCircle,
  BookOpen,
  Video,
  Newspaper,
  Globe,
  Filter,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Settings,
  AlertCircle,
  X,
  Target,
  Users,
  Hash
} from 'lucide-react';
import { clsx } from 'clsx';

const sourceConfig: Record<string, { label: string; icon: React.ElementType; color: string; badgeColor: string }> = {
  all: { label: '全网', icon: Globe, color: 'bg-gray-100 text-gray-700', badgeColor: 'bg-gray-500' },
  weibo: { label: '微博', icon: MessageCircle, color: 'bg-red-100 text-red-600', badgeColor: 'bg-red-500' },
  zhihu: { label: '知乎', icon: BookOpen, color: 'bg-blue-100 text-blue-600', badgeColor: 'bg-blue-500' },
  bilibili: { label: 'B站', icon: Video, color: 'bg-pink-100 text-pink-600', badgeColor: 'bg-pink-500' },
  toutiao: { label: '头条', icon: Newspaper, color: 'bg-orange-100 text-orange-600', badgeColor: 'bg-orange-500' },
};

interface MinedTopic {
  title: string;
  angle: string;
  heatScore: number;
  audience: string;
  tags: string[];
  reasoning?: string;
}

export default function HotnewsPage() {
  const params = useParams();
  const { setCurrentStep, llmConfig } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [hotnews, setHotnews] = useState<HotNewsResult | null>(null);
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  
  const [miningSources, setMiningSources] = useState<string[]>(['all']);
  const [miningKeywords, setMiningKeywords] = useState('');
  const [miningCount, setMiningCount] = useState(8);
  const [miningResult, setMiningResult] = useState<{ topics: MinedTopic[]; hotnewsSummary?: any } | null>(null);
  const [miningLoading, setMiningLoading] = useState(false);
  const [miningError, setMiningError] = useState<string | null>(null);
  const [expandedTopic, setExpandedTopic] = useState<number | null>(null);

  useEffect(() => {
    setCurrentStep(1);
    loadHotnews();
  }, []);

  async function loadHotnews() {
    try {
      setLoading(true);
      const sources = selectedSource === 'all' 
        ? ['weibo', 'zhihu', 'bilibili', 'toutiao']
        : [selectedSource];
      const response = await hotnewsApi.getAll(sources);
      setHotnews(response.data);
    } catch (error) {
      console.error('Failed to load hotnews:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleMiningSource(source: string) {
    if (source === 'all') {
      setMiningSources(['all']);
    } else {
      const newSources = miningSources.filter(s => s !== 'all');
      if (miningSources.includes(source)) {
        const filtered = newSources.filter(s => s !== source);
        setMiningSources(filtered.length > 0 ? filtered : ['all']);
      } else {
        setMiningSources([...newSources, source]);
      }
    }
  }

  async function handleMineTopics() {
    if (!llmConfig.apiKey) {
      setMiningError('请先配置 LLM API Key（点击侧边栏的"LLM 设置"按钮）');
      return;
    }

    setMiningLoading(true);
    setMiningError(null);
    setMiningResult(null);

    try {
      const keywords = miningKeywords
        .split(/[,，\s]+/)
        .map(k => k.trim())
        .filter(k => k.length > 0);

      const response = await hotnewsApi.mineTopics({
        keywords: keywords.length > 0 ? keywords : undefined,
        count: miningCount,
        sources: miningSources,
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

  const getFilteredItems = () => {
    if (!hotnews) return [];
    
    let items = selectedSource === 'all' 
      ? hotnews.merged 
      : (hotnews.sources[selectedSource] || []);
    
    if (selectedCategory !== 'all') {
      items = items.filter(item => item.category === selectedCategory);
    }
    
    if (searchKeyword) {
      items = items.filter(item => 
        item.title.toLowerCase().includes(searchKeyword.toLowerCase())
      );
    }
    
    return items;
  };

  const categories = hotnews ? Object.keys(hotnews.byCategory) : [];
  const filteredItems = getFilteredItems();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Loader2 className="animate-spin h-10 w-10 text-primary-500 mx-auto mb-4" />
          <p className="text-gray-500">加载热搜数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="text-primary-500" size={24} />
              热搜选题
            </h2>
            <p className="text-gray-500 mt-1">多平台热搜聚合，智能选题挖掘</p>
          </div>
          <button
            onClick={loadHotnews}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw size={18} />
            刷新
          </button>
        </div>

        <div className="flex flex-wrap gap-3 mb-4">
          <button
            onClick={() => setSelectedSource('all')}
            className={clsx(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              selectedSource === 'all'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            <Globe size={16} />
            全部平台
          </button>
          {Object.entries(sourceConfig).filter(([k]) => k !== 'all').map(([key, config]) => (
            <button
              key={key}
              onClick={() => setSelectedSource(key)}
              className={clsx(
                'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                selectedSource === key
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              <config.icon size={16} />
              {config.label}
            </button>
          ))}
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setSelectedCategory('all')}
              className={clsx(
                'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                selectedCategory === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              全部分类
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={clsx(
                  'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                  selectedCategory === cat
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="搜索热搜关键词..."
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">
                热搜列表 ({filteredItems.length})
              </h3>
            </div>
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {filteredItems.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  暂无数据
                </div>
              ) : (
                filteredItems.slice(0, 50).map((item, index) => {
                  const source = sourceConfig[item.source];
                  return (
                    <div key={`${item.source}-${item.rank}`} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-3">
                        <span className={clsx(
                          'w-6 h-6 rounded flex items-center justify-center text-xs font-bold shrink-0',
                          index < 3 ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500'
                        )}>
                          {item.rank}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 hover:text-primary-600 transition-colors cursor-pointer line-clamp-2">
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className={clsx(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
                              source?.color || 'bg-gray-100 text-gray-600'
                            )}>
                              {source?.icon && <source.icon size={12} />}
                              {source?.label || item.source}
                            </span>
                            {item.hotValue > 0 && (
                              <span className="text-xs text-gray-500">
                                热度: {item.hotValue.toLocaleString()}
                              </span>
                            )}
                            {item.category && (
                              <span className="text-xs text-gray-400">
                                {item.category}
                              </span>
                            )}
                          </div>
                        </div>
                        <button 
                          className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 transition-colors rounded-lg"
                          onClick={() => setMiningKeywords(prev => prev ? `${prev}, ${item.title}` : item.title)}
                          title="添加到选题关键词"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles size={18} className="text-primary-500" />
                智能选题挖掘
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  选题方向关键词（可选，多个用逗号分隔）
                </label>
                <input
                  type="text"
                  value={miningKeywords}
                  onChange={(e) => setMiningKeywords(e.target.value)}
                  placeholder="例如：AI, 人工智能, 大模型"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  数据来源平台
                </label>
                <div className="flex flex-wrap gap-2">
                  {['all', 'weibo', 'zhihu', 'bilibili', 'toutiao'].map((source) => {
                    const config = sourceConfig[source];
                    const isSelected = miningSources.includes(source) || (source === 'all' && miningSources.includes('all'));
                    return (
                      <button
                        key={source}
                        onClick={() => toggleMiningSource(source)}
                        className={clsx(
                          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                          isSelected
                            ? 'bg-primary-50 text-primary-700 border-primary-300'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                        )}
                      >
                        <config.icon size={12} />
                        {config.label}
                      </button>
                    );
                  })}
                </div>
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
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {miningLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    AI 分析中...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    开始智能挖掘
                  </>
                )}
              </button>
            </div>

            {miningResult?.topics && miningResult.topics.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">
                    挖掘结果 ({miningResult.topics.length} 个选题)
                  </h4>
                  {miningResult.hotnewsSummary && (
                    <span className="text-xs text-gray-500">
                      基于 {miningResult.hotnewsSummary.totalItems} 条热点
                    </span>
                  )}
                </div>
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {miningResult.topics.map((topic, index) => (
                    <div 
                      key={index}
                      className={clsx(
                        'p-4 rounded-lg border transition-all cursor-pointer',
                        expandedTopic === index
                          ? 'bg-primary-50 border-primary-200'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      )}
                      onClick={() => setExpandedTopic(expandedTopic === index ? null : index)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={clsx(
                              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                              topic.heatScore >= 80 ? 'bg-red-500 text-white' :
                              topic.heatScore >= 60 ? 'bg-amber-500 text-white' :
                              'bg-gray-400 text-white'
                            )}>
                              {index + 1}
                            </span>
                            <h5 className="font-medium text-gray-900 text-sm line-clamp-2">
                              {topic.title}
                            </h5>
                          </div>
                          <div className="flex items-center gap-2 ml-8">
                            <span className={clsx(
                              'text-xs font-medium px-2 py-0.5 rounded',
                              topic.heatScore >= 80 ? 'bg-red-100 text-red-700' :
                              topic.heatScore >= 60 ? 'bg-amber-100 text-amber-700' :
                              'bg-gray-100 text-gray-600'
                            )}>
                              热度 {topic.heatScore}分
                            </span>
                            {expandedTopic === index ? (
                              <ChevronUp size={14} className="text-gray-400" />
                            ) : (
                              <ChevronDown size={14} className="text-gray-400" />
                            )}
                          </div>
                        </div>
                        <button 
                          className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-100 rounded transition-colors shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          title="保存为选题"
                        >
                          <Plus size={16} />
                        </button>
                      </div>

                      {expandedTopic === index && (
                        <div className="mt-3 ml-8 space-y-3 text-sm">
                          <div>
                            <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                              <Target size={12} />
                              <span className="font-medium">切入角度</span>
                            </div>
                            <p className="text-gray-700">{topic.angle}</p>
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                              <Users size={12} />
                              <span className="font-medium">目标受众</span>
                            </div>
                            <p className="text-gray-700">{topic.audience}</p>
                          </div>
                          {topic.tags && topic.tags.length > 0 && (
                            <div>
                              <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                                <Hash size={12} />
                                <span className="font-medium">标签</span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {topic.tags.map((tag, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {topic.reasoning && (
                            <div className="p-2 bg-white/50 rounded border border-gray-200">
                              <p className="text-gray-600 text-xs italic">{topic.reasoning}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {hotnews?.trendingKeywords && hotnews.trendingKeywords.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">热门关键词</h3>
              <div className="flex flex-wrap gap-2">
                {hotnews.trendingKeywords.slice(0, 15).map((item, index) => (
                  <button
                    key={index}
                    onClick={() => setMiningKeywords(prev => prev ? `${prev}, ${item.keyword}` : item.keyword)}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-primary-100 hover:text-primary-700 transition-colors"
                  >
                    #{item.keyword}
                    <span className="text-xs text-gray-400 ml-1">({item.count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
