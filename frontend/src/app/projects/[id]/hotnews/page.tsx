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
  Filter,
  Loader2,
  Sparkles
} from 'lucide-react';
import { clsx } from 'clsx';

const sourceConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  weibo: { label: '微博', icon: MessageCircle, color: 'bg-red-100 text-red-600' },
  zhihu: { label: '知乎', icon: BookOpen, color: 'bg-blue-100 text-blue-600' },
  bilibili: { label: 'B站', icon: Video, color: 'bg-pink-100 text-pink-600' },
  toutiao: { label: '头条', icon: Newspaper, color: 'bg-orange-100 text-orange-600' },
};

export default function HotnewsPage() {
  const params = useParams();
  const { setCurrentStep } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [hotnews, setHotnews] = useState<HotNewsResult | null>(null);
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [miningKeyword, setMiningKeyword] = useState('');
  const [miningResult, setMiningResult] = useState<any>(null);
  const [miningLoading, setMiningLoading] = useState(false);

  useEffect(() => {
    setCurrentStep(1);
    loadHotnews();
  }, []);

  async function loadHotnews() {
    try {
      setLoading(true);
      const response = await hotnewsApi.getAll(['weibo', 'zhihu', 'bilibili']);
      setHotnews(response.data);
    } catch (error) {
      console.error('Failed to load hotnews:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleMineTopics() {
    if (!miningKeyword.trim()) return;
    
    try {
      setMiningLoading(true);
      const response = await hotnewsApi.mineTopics([miningKeyword], 5);
      setMiningResult(response.data);
    } catch (error) {
      console.error('Failed to mine topics:', error);
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
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              selectedSource === 'all'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            全部平台
          </button>
          {Object.entries(sourceConfig).map(([key, config]) => (
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
                          'w-6 h-6 rounded flex items-center justify-center text-xs font-bold',
                          index < 3 ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500'
                        )}>
                          {item.rank}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 hover:text-primary-600 transition-colors cursor-pointer line-clamp-2">
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-3 mt-1">
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
                            <span className="text-xs text-gray-400">
                              {item.category}
                            </span>
                          </div>
                        </div>
                        <button className="p-2 text-gray-400 hover:text-primary-500 transition-colors">
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
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles size={18} className="text-primary-500" />
              智能选题挖掘
            </h3>
            <div className="space-y-3">
              <input
                type="text"
                value={miningKeyword}
                onChange={(e) => setMiningKeyword(e.target.value)}
                placeholder="输入关键词挖掘选题..."
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
              <button
                onClick={handleMineTopics}
                disabled={miningLoading || !miningKeyword.trim()}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                {miningLoading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Sparkles size={18} />
                )}
                挖掘选题
              </button>
            </div>

            {miningResult && (
              <div className="mt-4 space-y-2">
                {miningResult.topics?.map((topic: any, index: number) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-gray-900 text-sm">{topic.title}</h4>
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        {topic.heat_score}分
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{topic.angle}</p>
                    {topic.tags && (
                      <div className="flex gap-1 mt-2">
                        {topic.tags.map((tag: string, i: number) => (
                          <span key={i} className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
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
                    onClick={() => setMiningKeyword(item.keyword)}
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
