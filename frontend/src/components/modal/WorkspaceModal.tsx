"use client";

import { useState, useEffect } from "react";
import { X, FolderOpen, Check, AlertCircle } from "lucide-react";
import { isTauri, selectFolder } from "@/lib/platform";

interface WorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (path: string) => void;
}

export function WorkspaceModal({
  isOpen,
  onClose,
  onConfirm,
}: WorkspaceModalProps) {
  const [selectedPath, setSelectedPath] = useState("");
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setError("");
      setSelectedPath("");
    }
  }, [isOpen]);

  async function handleSelectFolder() {
    setSelecting(true);
    setError("");

    const result = await selectFolder();
    if (!result.canceled && result.path) {
      setSelectedPath(result.path);
    }
    setSelecting(false);
  }

  function handleConfirm() {
    if (!selectedPath.trim()) return;
    onConfirm(selectedPath);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-surface-100 max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <FolderOpen size={20} className="text-primary-500" />
            <h2 className="wen-title text-ink-900">设置工作区</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-ink-400 hover:text-ink-600 hover:bg-surface-200/50 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-ink-600 mb-6">
          设置默认工作区，导入和导出的 Markdown 文件都将默认存放在此位置。
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-sm text-red-600 flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="space-y-4">
          {isTauri ? (
            <button
              onClick={handleSelectFolder}
              disabled={selecting}
              className="w-full px-4 py-8 border-2 border-dashed border-surface-300 hover:border-primary-400 hover:bg-primary-50 transition-colors disabled:opacity-50"
            >
              <div className="flex flex-col items-center gap-2">
                <FolderOpen
                  size={32}
                  className={selectedPath ? "text-primary-500" : "text-ink-400"}
                />
                {selecting ? (
                  <span className="text-sm text-ink-500">正在打开...</span>
                ) : selectedPath ? (
                  <>
                    <span className="text-sm font-medium text-primary-600">
                      {selectedPath}
                    </span>
                    <span className="text-xs text-ink-500">点击重新选择</span>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-medium text-ink-700">
                      点击选择文件夹
                    </span>
                    <span className="text-xs text-ink-500">支持读写权限</span>
                  </>
                )}
              </div>
            </button>
          ) : (
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">
                工作区路径
              </label>
              <input
                type="text"
                value={selectedPath}
                onChange={(e) => setSelectedPath(e.target.value)}
                placeholder="输入文件夹路径，如 /Users/xxx/Documents/文章"
                className="w-full px-4 py-3 border border-surface-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm font-mono"
              />
              <p className="text-xs text-ink-500 mt-1">
                输入电脑上的文件夹绝对路径
              </p>
            </div>
          )}

          {selectedPath && (
            <div className="p-3 bg-green-50 border border-green-200 flex items-center gap-2 text-sm text-green-700">
              <Check size={16} />
              工作区: {selectedPath}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-ink-600 hover:bg-surface-200/50 transition-colors"
          >
            跳过
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedPath.trim()}
            className="wen-btn-seal disabled:opacity-50 disabled:cursor-not-allowed"
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
}
