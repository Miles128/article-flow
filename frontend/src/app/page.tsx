'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, MoreVertical } from 'lucide-react';
import { projectsApi } from '@/lib/api/client';
import type { Project } from '@/types';
import { clsx } from 'clsx';
import { WorkspaceModal } from '@/components/modal/WorkspaceModal';
import { AppShell } from '@/components/layout/AppShell';
import { useAppStore } from '@/lib/store';
import { isTauri } from '@/lib/platform';
import { CONTENT_TYPE_CONFIG, type ContentType } from '@/lib/store';

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'text-ink-400' },
  in_progress: { label: '进行中', color: 'text-accent-600' },
  reviewing: { label: '审核中', color: 'text-accent-600' },
  published: { label: '已发布', color: 'text-ink-500' },
};

export default function HomePage() {
  const router = useRouter();
  const { workspace, setWorkspace, setCurrentProject, showWorkspacePicker, setShowWorkspacePicker, workspaceFiles } = useAppStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteConfirmProject, setDeleteConfirmProject] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [newProject, setNewProject] = useState({
    title: '',
    contentType: 'article' as ContentType,
    targetWordCount: 2000,
  });

  useEffect(() => {
    setCurrentProject(null);
    loadProjects();
  }, [setCurrentProject]);

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

  async function handleOpenMDFile(file: { name: string; path: string }) {
    if (!isTauri) {
      alert('打开文件功能仅在桌面版中可用');
      return;
    }
    try {
      const { readTextFile } = await import('@tauri-apps/plugin-fs');
      const text = await readTextFile(file.path);

      const response = await projectsApi.create({
        title: file.name.replace(/\.(md|markdown|txt)$/, ''),
        workspace: 'general',
        targetWordCount: 2000
      });

      const projectId = response.data._id;
      await projectsApi.createContent(projectId, {
        step: 5,
        content: text,
        contentType: 'markdown'
      });

      router.push(`/projects/${projectId}`);
    } catch (error: any) {
      console.error('打开文件失败:', error);
      alert('打开失败: ' + (error.friendlyMessage || error.message || ''));
    }
  }

  async function createProject() {
    if (!newProject.title.trim()) return;
    
    setCreating(true);
    setCreateError('');
    try {
      const response = await projectsApi.create(newProject);
      setShowCreateModal(false);
      setNewProject({ title: '', contentType: 'article', targetWordCount: 2000 });
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
    setDeleteError('');
    try {
      await projectsApi.delete(project._id);
      setProjects((prev) => prev.filter((p) => p._id !== project._id));
      setDeleteConfirmProject(null);
    } catch (error: any) {
      const msg = error?.friendlyMessage || error?.message || '删除失败，请确认后端服务已启动';
      setDeleteError(msg);
      console.error('Failed to delete project:', error);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-ink-200 border-t-ink-600 mx-auto mb-3"></div>
            <p className="text-ink-400">加载中...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      header={
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <h1 className="wen-title">项目</h1>
            <div className="flex-1" />
            <button type="button" onClick={() => setShowCreateModal(true)} className="wen-btn">
              <Plus size={14} strokeWidth={1.5} />
              新建
            </button>
          </div>
        </div>
      }
    >
      <WorkspaceModal
        isOpen={showWorkspacePicker}
        onClose={() => setShowWorkspacePicker(false)}
        onConfirm={(path) => setWorkspace({ path, type: 'general' })}
      />
      {openMenuId && (
        <div className="fixed inset-0 z-20" onClick={() => setOpenMenuId(null)} />
      )}
      <div className="max-w-3xl mx-auto px-6 py-6">
        {workspaceFiles.length > 0 ? (
          <div>
            <div className="flex items-baseline gap-2 mb-4 pb-3 border-b border-surface-300">
              <h2 className="wen-title">工作区文件</h2>
              <span className="text-ink-300">{workspace.path?.split('/').pop()}</span>
              <span className="text-ink-400">{workspaceFiles.length} 篇</span>
            </div>
            <div className="border-t border-surface-300">
              {workspaceFiles.map((file) => (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => handleOpenMDFile(file)}
                  className="wen-list-row w-full text-left px-1"
                >
                  <h3 className="wen-title text-ink-800 hover:text-primary-600 transition-colors truncate">
                    {file.name.replace(/\.(md|markdown|txt)$/, '')}
                  </h3>
                  <p className="text-ink-400 mt-1">{file.name.split('.').pop()?.toUpperCase()}</p>
                </button>
              ))}
            </div>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-24">
            <h3 className="wen-title mb-2">还没有项目</h3>
            <p className="text-ink-400 mb-8">落笔之前，先立一项</p>
            <button type="button" onClick={() => setShowCreateModal(true)} className="wen-btn-seal">
              <Plus size={14} strokeWidth={1.5} />
              创建项目
            </button>
          </div>
        ) : (
          <div className="border-t border-surface-300">
            {projects.map((project) => {
              const ct = project.contentType || 'article';
              const ctConfig = CONTENT_TYPE_CONFIG[ct as ContentType] || CONTENT_TYPE_CONFIG.article;
              const status = statusConfig[project.status];
              const progress = Math.min(100, Math.round((project.wordCount / project.targetWordCount) * 100));

              return (
                <div key={project._id} className="wen-list-row relative px-1">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/projects/${project._id}`} className="flex-1 min-w-0">
                      <h3 className="wen-title text-ink-900 hover:text-primary-600 transition-colors truncate mb-1.5">
                        {project.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-400">
                        <span>{ctConfig.label}</span>
                        <span className="text-ink-200">·</span>
                        <span className={status.color}>{status.label}</span>
                        <span className="text-ink-200">·</span>
                        <span>{project.wordCount} / {project.targetWordCount} 字</span>
                        <span className="text-ink-200">·</span>
                        <span>{new Date(project.updatedAt).toLocaleDateString('zh-CN')}</span>
                      </div>
                      <div className="mt-2 h-px bg-surface-300 relative overflow-hidden max-w-xs">
                        <div className="absolute inset-y-0 left-0 bg-ink-600/70" style={{ width: `${progress}%` }} />
                      </div>
                    </Link>
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === project._id ? null : project._id);
                        }}
                        className="p-1 text-ink-300 hover:text-ink-600"
                      >
                        <MoreVertical size={14} strokeWidth={1.5} />
                      </button>
                      {openMenuId === project._id && (
                        <div className="absolute right-0 top-6 z-30 w-24 bg-surface-50/70 backdrop-blur-[3px] border border-surface-300 py-0.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(null);
                              setDeleteConfirmProject(project);
                            }}
                            className="w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50"
                          >
                            删除
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/15 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-50/70 backdrop-blur-[3px] max-w-md w-full p-6 border border-surface-300">
            <h2 className="wen-title mb-5">创建新项目</h2>

            {createError && (
              <div className="mb-4 p-3 border border-red-200 text-red-600 bg-red-50/50">
                {createError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-ink-400 mb-1.5 font-kaiti">项目名称</label>
                <input
                  type="text"
                  value={newProject.title}
                  onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                  placeholder="输入文章标题"
                  className="wen-input font-kaiti"
                />
              </div>

              <div>
                <label className="block text-ink-400 mb-1.5 font-kaiti">内容类型</label>
                <div className="grid grid-cols-3 gap-px bg-surface-300 border border-surface-300">
                  {(Object.entries(CONTENT_TYPE_CONFIG) as [ContentType, typeof CONTENT_TYPE_CONFIG[ContentType]][]).map(([key, config]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setNewProject({ ...newProject, contentType: key })}
                      className={clsx(
                        'p-2.5 text-center transition-colors bg-surface-50/70 backdrop-blur-[3px]',
                        newProject.contentType === key
                          ? 'text-primary-600 bg-primary-50'
                          : 'text-ink-500 hover:text-ink-800'
                      )}
                    >
                      <span className="font-kaiti block">{config.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-ink-400 mb-1.5 font-kaiti">目标字数</label>
                <select
                  value={newProject.targetWordCount}
                  onChange={(e) => setNewProject({ ...newProject, targetWordCount: Number(e.target.value) })}
                  className="wen-input"
                >
                  <option value={1000}>1000 字</option>
                  <option value={2000}>2000 字</option>
                  <option value={3000}>3000 字</option>
                  <option value={5000}>5000 字</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button type="button" onClick={() => setShowCreateModal(false)} className="wen-btn">
                取消
              </button>
              <button
                type="button"
                onClick={createProject}
                disabled={!newProject.title.trim() || creating}
                className="wen-btn-seal"
              >
                {creating && <Loader2 size={14} className="animate-spin" />}
                {creating ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmProject && (
        <div className="fixed inset-0 bg-black/15 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-50/70 backdrop-blur-[3px] max-w-sm w-full p-6 border border-surface-300">
            <h2 className="wen-title mb-3">删除项目</h2>
            <p className="text-ink-500 mb-4">
              确定要删除 <span className="font-kaiti text-ink-800">「{deleteConfirmProject.title}」</span> 吗？此操作无法撤销。
            </p>
            {deleteError && (
              <p className="text-red-600 border border-red-200 px-3 py-2 mb-4">{deleteError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => { setDeleteConfirmProject(null); setDeleteError(''); }} className="wen-btn">
                取消
              </button>
              <button
                type="button"
                onClick={() => deleteProject(deleteConfirmProject)}
                disabled={deleting}
                className="wen-btn text-red-600 border-red-300 hover:border-red-400 hover:bg-red-50"
              >
                {deleting && <Loader2 size={14} className="animate-spin" />}
                {deleting ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
