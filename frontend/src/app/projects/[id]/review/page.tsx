'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { reviewApi } from '@/lib/api/client';
import type { Comment, AuditFlow } from '@/types';
import { 
  CheckSquare, 
  Plus, 
  Trash2, 
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Loader2,
  Send,
  User
} from 'lucide-react';
import { clsx } from 'clsx';

export default function ReviewPage() {
  const params = useParams();
  const { currentProject, setCurrentStep } = useAppStore();
  const [comments, setComments] = useState<Comment[]>([]);
  const [auditFlows, setAuditFlows] = useState<AuditFlow[]>([]);
  const [selectedFlow, setSelectedFlow] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showAddComment, setShowAddComment] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResults, setAuditResults] = useState<any>(null);

  useEffect(() => {
    setCurrentStep(6);
    loadComments();
    loadAuditFlows();
  }, []);

  async function loadComments() {
    if (!params.id) return;
    try {
      setLoading(true);
      const response = await reviewApi.getComments(params.id as string);
      setComments(response.data);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadAuditFlows() {
    try {
      const response = await reviewApi.getAuditFlows();
      setAuditFlows(response.data);
      if (response.data.length > 0) {
        setSelectedFlow(response.data[0].id);
      }
    } catch (error) {
      console.error('Failed to load audit flows:', error);
    }
  }

  async function addComment() {
    if (!newComment.trim() || !params.id) return;
    
    try {
      await reviewApi.createComment({
        projectId: params.id as string,
        content: newComment,
        author: '我',
      });
      setShowAddComment(false);
      setNewComment('');
      loadComments();
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  }

  async function toggleResolve(commentId: string, resolved: boolean) {
    try {
      await reviewApi.updateComment(commentId, { resolved: !resolved });
      loadComments();
    } catch (error) {
      console.error('Failed to update comment:', error);
    }
  }

  async function runAudit() {
    if (!selectedFlow) return;
    
    setIsAuditing(true);
    try {
      const mockContent = '这是一篇示例文章，用于AI审核测试。';
      const response = await reviewApi.runAudit(mockContent, selectedFlow);
      setAuditResults(response.data);
    } catch (error) {
      console.error('Failed to run audit:', error);
    } finally {
      setIsAuditing(false);
    }
  }

  const resolvedCount = comments.filter(c => c.resolved).length;
  const pendingCount = comments.length - resolvedCount;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin h-10 w-10 text-primary-500 mx-auto" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <CheckSquare className="text-primary-500" size={24} />
              修改审核
            </h2>
            <p className="text-gray-500 mt-1">评论批注、AI 合规检查、逻辑一致性分析</p>
          </div>
          <button
            onClick={() => setShowAddComment(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            <Plus size={18} />
            添加评论
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  评论列表
                </span>
                <span className="flex items-center gap-2 text-sm">
                  <span className="flex items-center gap-1 text-amber-600">
                    <AlertCircle size={14} />
                    待处理 {pendingCount}
                  </span>
                  <span className="text-gray-300">|</span>
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 size={14} />
                    已解决 {resolvedCount}
                  </span>
                </span>
              </div>
            </div>

            {comments.length === 0 ? (
              <div className="p-16 text-center">
                <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">还没有评论</h3>
                <p className="text-gray-500 mb-6">添加评论批注来标记需要修改的内容</p>
                <button
                  onClick={() => setShowAddComment(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  <Plus size={16} />
                  添加第一个评论
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {comments.map((comment) => (
                  <div
                    key={comment._id}
                    className={clsx(
                      'p-4 hover:bg-gray-50 transition-colors',
                      comment.resolved && 'opacity-60'
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                          <User size={16} className="text-primary-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{comment.author}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(comment.createdAt).toLocaleString('zh-CN')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleResolve(comment._id, comment.resolved)}
                          className={clsx(
                            'p-1.5 rounded transition-colors',
                            comment.resolved
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                          )}
                          title={comment.resolved ? '标记为待处理' : '标记为已解决'}
                        >
                          <CheckCircle2 size={16} />
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-700 text-sm ml-10">{comment.content}</p>
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="ml-10 mt-3 space-y-2">
                        {comment.replies.map((reply, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-xs font-medium text-gray-700">{reply.author}</p>
                              <p className="text-xs text-gray-400">
                                {new Date(reply.createdAt).toLocaleString('zh-CN')}
                              </p>
                            </div>
                            <p className="text-sm text-gray-600">{reply.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles size={18} className="text-primary-500" />
              AI 审核流程
            </h3>

            <div className="space-y-3 mb-4">
              {auditFlows.map((flow) => (
                <button
                  key={flow.id}
                  onClick={() => setSelectedFlow(flow.id)}
                  className={clsx(
                    'w-full text-left p-3 rounded-lg border-2 transition-all',
                    selectedFlow === flow.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <p className={clsx(
                    'font-medium text-sm',
                    selectedFlow === flow.id ? 'text-primary-700' : 'text-gray-900'
                  )}>
                    {flow.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{flow.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {flow.steps.slice(0, 3).map((step, index) => (
                      <span
                        key={index}
                        className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                      >
                        {step.name}
                      </span>
                    ))}
                    {flow.steps.length > 3 && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                        +{flow.steps.length - 3}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={runAudit}
              disabled={isAuditing || !selectedFlow}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 text-sm"
            >
              {isAuditing ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Sparkles size={16} />
              )}
              {isAuditing ? '审核中...' : '运行 AI 审核'}
            </button>

            {auditResults && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={18} className="text-green-600" />
                  <span className="text-sm font-medium text-green-800">审核完成</span>
                </div>
                <p className="text-xs text-green-600">流程: {auditResults.flow_id}</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">审核统计</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-amber-50 rounded-lg text-center">
                <AlertCircle size={24} className="text-amber-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-amber-700">{pendingCount}</p>
                <p className="text-xs text-amber-600">待处理</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <CheckCircle2 size={24} className="text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-700">{resolvedCount}</p>
                <p className="text-xs text-green-600">已解决</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAddComment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">添加评论</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  评论内容
                </label>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="输入评论内容..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddComment(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={addComment}
                disabled={!newComment.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                <Send size={16} />
                发送
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
