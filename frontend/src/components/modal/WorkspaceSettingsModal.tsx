"use client";

import { X, FolderOpen } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { isTauri, selectFolder } from "@/lib/platform";
import { UiFontSwitcher } from "@/components/theme/UiFontSwitcher";
import { UiThemeSwitcher } from "@/components/theme/UiThemeSwitcher";

interface WorkspaceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WorkspaceSettingsModal({
  isOpen,
  onClose,
}: WorkspaceSettingsModalProps) {
  const { workspace, setWorkspace } = useAppStore();

  async function handleChangeWorkspace() {
    const result = await selectFolder();
    if (!result.canceled && result.path) {
      setWorkspace({ path: result.path, type: workspace.type || "general" });
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/15 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-surface-50/70 backdrop-blur-[3px] max-w-lg w-full max-h-[min(88vh,560px)] border border-surface-300 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-300 shrink-0">
          <h2 className="wen-title text-base">设置</h2>
          <button
            type="button"
            onClick={onClose}
            className="wen-icon-btn w-8 h-8 text-ink-400 hover:text-ink-800 border-0 bg-transparent"
            aria-label="关闭"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto min-h-0 flex-1">
          <label className="block text-xs text-ink-500 font-ui">
            工作区文件夹
          </label>
          <div className="flex items-center gap-2">
            {isTauri ? (
              <>
                <div className="flex-1 px-3 py-2 bg-surface-50/70 backdrop-blur-[3px] border border-surface-300 text-sm truncate text-ink-700">
                  {workspace.path || "未设置"}
                </div>
                <button
                  type="button"
                  onClick={handleChangeWorkspace}
                  className="wen-btn shrink-0"
                >
                  <FolderOpen size={14} strokeWidth={1.5} />
                  选择
                </button>
              </>
            ) : (
              <input
                type="text"
                value={workspace.path || ""}
                onChange={(e) =>
                  setWorkspace({
                    path: e.target.value,
                    type: workspace.type || "general",
                  })
                }
                placeholder="/Users/xxx/Documents/文章"
                className="wen-input font-mono text-sm"
              />
            )}
          </div>

          <div className="pt-3 border-t border-surface-300 space-y-3">
            <UiThemeSwitcher />
            <UiFontSwitcher />
          </div>
        </div>

        <div className="px-4 py-3 border-t border-surface-300 flex justify-end gap-2 shrink-0 bg-surface-50/90">
          <button type="button" onClick={onClose} className="wen-btn-seal min-w-[5.5rem]">
            确定
          </button>
        </div>
      </div>
    </div>
  );
}
