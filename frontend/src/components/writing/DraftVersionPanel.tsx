'use client';

import { useCallback, useEffect, useState } from 'react';
import { writingApi } from '@/lib/api/client';
import { getApiError } from '@/lib/apiError';
import { showToast } from '@/components/ui/Toast';
import { clsx } from 'clsx';
import { History, Loader2, RotateCcw, X, Eye } from 'lucide-react';

export type DraftVersionItem = {
  _id: string;
  versionNumber: number;
  note: string;
  createdAt: string;
  wordCount: number;
  preview: string;
};

type DraftVersionPanelProps = {
  projectId: string;
  currentContent: string;
  open: boolean;
  onClose: () => void;
  onRestore: (content: string, contentId: string) => void;
};

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function DraftVersionPanel({
  projectId,
  currentContent,
  open,
  onClose,
  onRestore,
}: DraftVersionPanelProps) {
  const [versions, setVersions] = useState<DraftVersionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const loadVersions = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const resp = await writingApi.listVersions(projectId);
      setVersions(resp.data.versions || []);
    } catch (error: unknown) {
      showToast('error', getApiError(error, '加载版本历史失败'));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (open) {
      loadVersions();
      setPreviewId(null);
      setPreviewContent('');
    }
  }, [open, loadVersions]);

  async function handlePreview(versionId: string) {
    if (previewId === versionId) {
      setPreviewId(null);
      setPreviewContent('');
      return;
    }
    setPreviewLoading(true);
    try {
      const resp = await writingApi.getVersion(versionId);
      setPreviewId(versionId);
      setPreviewContent(resp.data.content || '');
    } catch (error: unknown) {
      showToast('error', getApiError(error, '加载版本预览失败'));
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleRestore(versionId: string) {
    const label = versions.find((v) => v._id === versionId);
    const ok = window.confirm(
      `确定恢复到版本 v${label?.versionNumber ?? ''}？当前内容会先自动备份。`,
    );
    if (!ok) return;

    setRestoringId(versionId);
    try {
      const resp = await writingApi.restoreVersion({
        projectId,
        versionId,
        currentContent,
      });
      onRestore(resp.data.content, resp.data.contentId);
      showToast('success', `已恢复到版本 v${resp.data.versionNumber}`);
      onClose();
    } catch (error: unknown) {
      showToast('error', getApiError(error, '恢复版本失败'));
    } finally {
      setRestoringId(null);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        aria-label="关闭版本历史"
        onClick={onClose}
      />
      <aside className="relative w-full max-w-md h-full bg-surface-50/70 backdrop-blur-[3px] border-l border-surface-300 flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-300">
          <div className="flex items-center gap-2">
            <History size={18} className="text-primary-500" />
            <h2 className="wen-title text-base">版本历史</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-ink-400 hover:text-ink-700">
            <X size={18} />
          </button>
        </div>

        <p className="px-4 py-2 text-xs text-ink-500 border-b border-surface-200">
          每次保存会自动留档；恢复前会把当前草稿再备份一份。
        </p>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-ink-400">
              <Loader2 className="animate-spin mr-2" size={18} />
              加载中…
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-16 px-4">
              <p className="text-sm text-ink-500 mb-3">暂无历史版本</p>
              <p className="text-xs text-ink-400">
                每次保存后会自动留档。若刚清空编辑器，可关闭面板后点「恢复已保存草稿」。
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-surface-200">
              {versions.map((v) => (
                <li key={v._id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink-800">
                        v{v.versionNumber}
                        {v.note ? (
                          <span className="text-ink-400 font-normal ml-2">{v.note}</span>
                        ) : null}
                      </p>
                      <p className="text-xs text-ink-400 mt-0.5">
                        {formatTime(v.createdAt)} · {v.wordCount} 字
                      </p>
                      <p className="text-xs text-ink-500 mt-1 line-clamp-2">{v.preview}</p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handlePreview(v._id)}
                        disabled={previewLoading && previewId !== v._id}
                        className="wen-btn text-xs px-2 py-1"
                      >
                        <Eye size={12} />
                        {previewId === v._id ? '收起' : '预览'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRestore(v._id)}
                        disabled={restoringId === v._id}
                        className={clsx(
                          'inline-flex items-center gap-1 text-xs px-2 py-1 border',
                          'border-primary-300 text-primary-700 hover:bg-primary-50',
                          restoringId === v._id && 'opacity-50',
                        )}
                      >
                        {restoringId === v._id ? (
                          <Loader2 className="animate-spin" size={12} />
                        ) : (
                          <RotateCcw size={12} />
                        )}
                        恢复
                      </button>
                    </div>
                  </div>
                  {previewId === v._id && previewContent ? (
                    <pre className="mt-2 max-h-40 overflow-y-auto text-xs bg-surface-200/40 p-2 whitespace-pre-wrap">
                      {previewContent}
                    </pre>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
