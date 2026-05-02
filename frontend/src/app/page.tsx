'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, MoreVertical, Calendar, FileText, TrendingUp, Target, PenTool, Loader2, Trash2, X } from 'lucide-react';
import { projectsApi } from '@/lib/api/client';
import type { Project } from '@/types';
import { clsx } from 'clsx';

const workspaceConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  wechat: { label: '公众号', icon: FileText, color: 'bg-green-100 text-green-700' },
  video: { label: '视频脚本', icon: PenTool, color: 'bg-blue-100 text-blue-700' },
  general: { label: '通用写作', icon: FileText, color: 'bg-gray-100 text-gray-700' },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-gray-100 text-gray-600' },
  in_progress: { label: '进行中', color: 'bg-blue-100 text-blue-700' },
  reviewing: { label: '审核中', color: 'bg-amber-100 text-amber-700' },
  published: { label: '已发布', color: 'bg-green-100 text-green-700' },
};

export default function HomePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteConfirmProject, setDeleteConfirmProject] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [newProject, setNewProject] = useState({
    title: '',
    workspace: 'general' as const,
    targetWordCount: 2000,
  });

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const response = await projectsApi.getAll();
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createProject() {
    if (!newProject.title.trim()) return;
    
    setCreating(true);
    setCreateError('');
    try {
      const response = await projectsApi.create(newProject);
      setShowCreateModal(false);
      setNewProject({ title: '', workspace: 'general', targetWordCount: 2000 });
      router.push(`/projects/${response.data._id}`);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const msg = err?.response?.data?.message || '创建失败，请检查后端服务是否运行';
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  }

  async function deleteProject(project: Project) {
    setDeleting(true);
    try {
      await projectsApi.delete(project._id);
      setProjects((prev) => prev.filter((p) => p._id !== project._id));
      setDeleteConfirmProject(null);
    } catch (error) {
      console.error('Failed to delete project:', error);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">项目列表</h1>
              <p className="text-sm text-gray-500 mt-1">管理您的文章写作项目</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              <Plus size={18} />
              新建项目
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {projects.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">还没有项目</h3>
            <p className="text-gray-500 mb-6">点击上方按钮创建您的第一个项目</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              <Plus size={18} />
              创建项目
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
              const workspace = workspaceConfig[project.workspace];
              const status = statusConfig[project.status];
              const progress = Math.min(100, Math.round((project.wordCount / project.targetWordCount) * 100));

              return (
                <div
                  key={project._id}
                  className="group bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-primary-300 transition-all relative"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className={clsx('px-2 py-1 text-xs font-medium rounded-full', workspace.color)}>
                        {workspace.label}
                      </span>
                      <span className={clsx('px-2 py-1 text-xs font-medium rounded-full', status.color)}>
                        {status.label}
                      </span>
                    </div>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === project._id ? null : project._id);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                      >
                        <MoreVertical size={16} />
                      </button>
                      {openMenuId === project._id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setOpenMenuId(null)}
                          />
                          <div className="absolute right-0 top-8 z-20 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                setDeleteConfirmProject(project);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 size={14} />
                              删除项目
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <Link href={`/projects/${project._id}`}>
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors mb-2">
                      {project.title}
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-sm text-gray-500 mb-1">
                          <span>写作进度</span>
                          <span>{project.wordCount} / {project.targetWordCount} 字</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary-500 h-2 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {project.aiTasteScore > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <TrendingUp size={14} className="text-gray-400" />
                          <span className="text-gray-500">AI 味:</span>
                          <span className={clsx(
                            'font-medium',
                            project.aiTasteScore < 30 ? 'text-green-600' :
                            project.aiTasteScore < 50 ? 'text-yellow-600' : 'text-red-600'
                          )}>
                            {project.aiTasteScore}%
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar size={14} />
                        <span>更新于 {new Date(project.updatedAt).toLocaleDateString('zh-CN')}</span>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">创建新项目</h2>

            {createError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {createError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  项目名称
                </label>
                <input
                  type="text"
                  value={newProject.title}
                  onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                  placeholder="输入文章标题"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  工作区类型
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(workspaceConfig).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => setNewProject({ ...newProject, workspace: key as any })}
                      className={clsx(
                        'p-3 rounded-lg border-2 text-center transition-all',
                        newProject.workspace === key
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <config.icon size={24} className={clsx(
                        'mx-auto mb-1',
                        newProject.workspace === key ? 'text-primary-600' : 'text-gray-400'
                      )} />
                      <span className={clsx(
                        'text-sm font-medium',
                        newProject.workspace === key ? 'text-primary-600' : 'text-gray-600'
                      )}>
                        {config.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  目标字数
                </label>
                <select
                  value={newProject.targetWordCount}
                  onChange={(e) => setNewProject({ ...newProject, targetWordCount: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                >
                  <option value={1000}>1000 字</option>
                  <option value={2000}>2000 字</option>
                  <option value={3000}>3000 字</option>
                  <option value={5000}>5000 字</option>
                </select>
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
                onClick={createProject}
                disabled={!newProject.title.trim() || creating}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {creating && <Loader2 size={16} className="animate-spin" />}
                {creating ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">删除项目</h2>
              <button
                onClick={() => setDeleteConfirmProject(null)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              确定要删除项目 <span className="font-semibold text-gray-900">"{deleteConfirmProject.title}"</span> 吗？
              <br />
              此操作无法撤销。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmProject(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => deleteProject(deleteConfirmProject)}
                disabled={deleting}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {deleting && <Loader2 size={16} className="animate-spin" />}
                {deleting ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
