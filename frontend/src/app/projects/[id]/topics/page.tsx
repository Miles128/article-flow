'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { topicsApi } from '@/lib/api/client';
import type { Topic } from '@/types';
import { 
  Target, 
  Plus, 
  Trash2, 
  Star, 
  Loader2,
  Sparkles,
  ChevronDown,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { clsx } from 'clsx';

export default function TopicsPage() {
  const params = useParams();
  const { currentProject, setCurrentStep } = useAppStore();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTopic, setNewTopic] = useState({
    title: '',
    description: '',
    tags: '',
    priority: 1
  });
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);

  useEffect(() => {
    setCurrentStep(2);
    loadTopics();
  }, []);

  async function loadTopics() {
    if (!params.id) return;
    try {
      setLoading(true);
      const response = await topicsApi.getByProject(params.id as string);
      setTopics(response.data);
    } catch (error) {
      console.error('Failed to load topics:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createTopic() {
    if (!newTopic.title.trim() || !params.id) return;
    
    try {
      const tags = newTopic.tags.split(',').map(t => t.trim()).filter(Boolean);
      await topicsApi.create({
        projectId: params.id as string,
        title: newTopic.title,
        description: newTopic.description,
        tags,
        priority: newTopic.priority
      });
      setShowCreateModal(false);
      setNewTopic({ title: '', description: '', tags: '', priority: 1 });
      loadTopics();
    } catch (error) {
      console.error('Failed to create topic:', error);
    }
  }

  async function updateTopicStatus(topicId: string, status: Topic['status']) {
    try {
      await topicsApi.update(topicId, { status });
      loadTopics();
    } catch (error) {
      console.error('Failed to update topic:', error);
    }
  }

  async function evaluateTopic(topicId: string) {
    setEvaluatingId(topicId);
    try {
      await topicsApi.evaluate(topicId);
      loadTopics();
    } catch (error) {
      console.error('Failed to evaluate topic:', error);
    } finally {
      setEvaluatingId(null);
    }
  }

  async function deleteTopic(topicId: string) {
    try {
      await topicsApi.delete(topicId);
      loadTopics();
    } catch (error) {
      console.error('Failed to delete topic:', error);
    }
  }

  const getPriorityColor = (priority: number) => {
    if (priority >= 4) return 'bg-red-100 text-red-700';
    if (priority >= 2) return 'bg-amber-100 text-amber-700';
    return 'bg-gray-100 text-gray-700';
  };

  const getStatusColor = (status: Topic['status']) => {
    switch (status) {
      case 'selected': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-gray-100 text-gray-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  const getStatusLabel = (status: Topic['status']) => {
    switch (status) {
      case 'selected': return '已选定';
      case 'rejected': return '已否决';
      default: return '待评估';
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Target className="text-primary-500" size={24} />
              确定选题
            </h2>
            <p className="text-gray-500 mt-1">多维度评估选题，选择最佳写作角度</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            <Plus size={18} />
            添加选题
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Loader2 className="animate-spin h-10 w-10 text-primary-500 mx-auto mb-4" />
            <p className="text-gray-500">加载选题列表...</p>
          </div>
        </div>
      ) : topics.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">还没有选题</h3>
          <p className="text-gray-500 mb-6">从热搜中挖掘选题，或手动添加您的选题</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            <Plus size={18} />
            创建第一个选题
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topics.map((topic) => (
            <div
              key={topic._id}
              className={clsx(
                'bg-white rounded-xl border-2 p-6 transition-all',
                topic.status === 'selected' 
                  ? 'border-green-300 bg-green-50/50' 
                  : 'border-gray-200 hover:border-primary-300'
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className={clsx(
                    'px-2 py-0.5 rounded-full text-xs font-medium',
                    getPriorityColor(topic.priority)
                  )}>
                    优先级 {topic.priority}
                  </span>
                  <span className={clsx(
                    'px-2 py-0.5 rounded-full text-xs font-medium',
                    getStatusColor(topic.status)
                  )}>
                    {getStatusLabel(topic.status)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {topic.status === 'pending' && (
                    <>
                      <button
                        onClick={() => updateTopicStatus(topic._id, 'selected')}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                        title="选定"
                      >
                        <CheckCircle2 size={18} />
                      </button>
                      <button
                        onClick={() => updateTopicStatus(topic._id, 'rejected')}
                        className="p-1.5 text-gray-400 hover:bg-gray-100 rounded transition-colors"
                        title="否决"
                      >
                        <XCircle size={18} />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => deleteTopic(topic._id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    title="删除"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">{topic.title}</h3>
              
              {topic.description && (
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{topic.description}</p>
              )}

              {topic.tags && topic.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {topic.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {topic.evaluation && topic.evaluation.overallScore > 0 && (
                <div className="border-t border-gray-100 pt-4 mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">AI 评估分数</span>
                    <span className={clsx(
                      'text-lg font-bold',
                      topic.evaluation.overallScore >= 70 ? 'text-green-600' :
                      topic.evaluation.overallScore >= 50 ? 'text-amber-600' : 'text-gray-500'
                    )}>
                      {topic.evaluation.overallScore}分
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-gray-50 rounded">
                      <p className="text-xs text-gray-500">趋势</p>
                      <p className="font-semibold text-gray-900">{topic.evaluation.trendScore}</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded">
                      <p className="text-xs text-gray-500">竞争</p>
                      <p className="font-semibold text-gray-900">{topic.evaluation.competitionScore}</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded">
                      <p className="text-xs text-gray-500">受众</p>
                      <p className="font-semibold text-gray-900">{topic.evaluation.audienceScore}</p>
                    </div>
                  </div>
                </div>
              )}

              {topic.status === 'pending' && (
                <button
                  onClick={() => evaluateTopic(topic._id)}
                  disabled={evaluatingId === topic._id}
                  className="w-full mt-4 inline-flex items-center justify-center gap-2 px-3 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors disabled:opacity-50 text-sm"
                >
                  {evaluatingId === topic._id ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Sparkles size={16} />
                  )}
                  {evaluatingId === topic._id ? '评估中...' : 'AI 多维度评估'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">添加选题</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  选题标题 *
                </label>
                <input
                  type="text"
                  value={newTopic.title}
                  onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })}
                  placeholder="输入选题标题"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  描述
                </label>
                <textarea
                  value={newTopic.description}
                  onChange={(e) => setNewTopic({ ...newTopic, description: e.target.value })}
                  placeholder="简要描述这个选题的核心内容"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  标签（用逗号分隔）
                </label>
                <input
                  type="text"
                  value={newTopic.tags}
                  onChange={(e) => setNewTopic({ ...newTopic, tags: e.target.value })}
                  placeholder="例如: 科技, AI, 职场"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  优先级
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((p) => (
                    <button
                      key={p}
                      onClick={() => setNewTopic({ ...newTopic, priority: p })}
                      className={clsx(
                        'flex-1 py-2 rounded-lg border-2 transition-colors text-sm font-medium',
                        newTopic.priority === p
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={createTopic}
                disabled={!newTopic.title.trim()}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
