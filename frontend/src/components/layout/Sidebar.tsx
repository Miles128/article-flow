"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  ChevronRight,
  FileText,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import {
  useAppStore,
  getContentTypeSteps,
  getStepPath,
  type ContentType,
} from "@/lib/store";
import {
  isTauri,
  openFile,
  saveFile,
  writeToWorkspace,
  readWorkspaceFiles,
} from "@/lib/platform";
import { clsx } from "clsx";
import { WorkspaceSettingsModal } from "@/components/modal/WorkspaceSettingsModal";
import { projectsApi } from "@/lib/api/client";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/layout/BrandLogo";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    currentProject,
    currentStep,
    setCurrentStep,
    sidebarOpen,
    sidebarCollapsed,
    toggleSidebar,
    setSidebarCollapsed,
    workspace,
    workspaceFiles,
    setWorkspaceFiles,
  } = useAppStore();
  const [showSettings, setShowSettings] = useState(false);
  const [showFilePicker, setShowFilePicker] = useState(false);

  useEffect(() => {
    useAppStore.setState({ sidebarOpen: false });
  }, [pathname]);

  const handleImportMD = async () => {
    if (!currentProject) return;

    if (isTauri && workspace.path) {
      const mdFiles = await readWorkspaceFiles(workspace.path);
      if (mdFiles.length === 0) {
        alert("工作区中没有 MD 文件");
        return;
      }
      setWorkspaceFiles(mdFiles);
      setShowFilePicker(true);
    } else {
      try {
        const result = await openFile(["md", "markdown", "txt"]);
        await projectsApi.createContent(currentProject._id, {
          step: currentStep || 5,
          content: result.content,
          contentType: "markdown",
        });
        alert("导入成功");
        window.location.reload();
      } catch (error: unknown) {
        const err = error as { message?: string };
        if (err.message === "AbortError") return;
        alert("导入失败: " + (err.message || ""));
      }
    }
  };

  const handleSelectWorkspaceFile = async (file: {
    name: string;
    path: string;
  }) => {
    if (!currentProject) return;
    setShowFilePicker(false);

    try {
      const { readTextFile } = await import("@tauri-apps/plugin-fs");
      const text = await readTextFile(file.path);

      await projectsApi.createContent(currentProject._id, {
        step: currentStep || 5,
        content: text,
        contentType: "markdown",
      });
      alert(`已导入: ${file.name}`);
      window.location.reload();
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error("导入失败:", error);
      alert("导入失败: " + (err.message || ""));
    }
  };

  const handleExportMD = async () => {
    if (!currentProject) return;

    try {
      const response = await projectsApi.getContents(
        currentProject._id,
        currentStep || 5,
      );
      const contents = response.data;

      if (!contents || contents.length === 0) {
        alert("当前步骤没有内容可导出");
        return;
      }

      const latestContent = contents[contents.length - 1];
      const fileName = `${currentProject.title}.md`;

      if (isTauri && workspace.path) {
        const ok = await writeToWorkspace(
          workspace.path,
          fileName,
          latestContent.content,
        );
        if (ok) {
          alert(`已导出到工作区: ${workspace.path}/${fileName}`);
          return;
        }
      }

      const savedPath = await saveFile({
        content: latestContent.content,
        suggestedName: fileName,
        extensions: ["md"],
      });
      if (savedPath) alert(`已保存: ${savedPath}`);
    } catch (error: unknown) {
      const err = error as { message?: string };
      if (err.message === "AbortError") return;
      console.error("导出失败:", error);
      alert("导出失败: " + (err.message || ""));
    }
  };

  const hideSidebar = () => {
    if (window.matchMedia("(min-width: 768px)").matches) {
      setSidebarCollapsed(true);
    } else {
      toggleSidebar();
    }
  };

  return (
    <>
      <WorkspaceSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {sidebarCollapsed && (
        <button
          type="button"
          onClick={() => setSidebarCollapsed(false)}
          className="hidden md:flex fixed top-3 left-3 z-50 p-2 text-ink-400 hover:text-ink-800 transition-colors"
          title="显示侧栏"
          aria-label="显示侧栏"
        >
          <PanelLeft size={18} strokeWidth={1.5} />
        </button>
      )}

      <button
        type="button"
        onClick={toggleSidebar}
        className="fixed top-3 left-3 z-50 p-2 text-ink-400 hover:text-ink-800 md:hidden"
        aria-label="切换菜单"
      >
        {sidebarOpen ? (
          <X size={18} strokeWidth={1.5} />
        ) : (
          <Menu size={18} strokeWidth={1.5} />
        )}
      </button>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/15 z-30 md:hidden"
          onClick={toggleSidebar}
          aria-hidden
        />
      )}

      <aside
        className={clsx(
          "fixed left-0 top-0 h-full w-40 bg-surface-100 border-r border-surface-300 z-40 transition-transform duration-200 flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          sidebarCollapsed ? "md:-translate-x-full" : "md:translate-x-0",
        )}
      >
        <div className="px-4 pt-5 pb-3 flex items-start justify-between gap-1">
          <BrandLogo href="/" size="md" />
          <button
            type="button"
            onClick={hideSidebar}
            className="p-1 text-ink-300 hover:text-ink-700 transition-colors shrink-0 mt-0.5"
            title="隐藏侧栏"
            aria-label="隐藏侧栏"
          >
            <PanelLeftClose
              size={15}
              strokeWidth={1.5}
              className="hidden md:block"
            />
            <X size={15} strokeWidth={1.5} className="md:hidden" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-1">
          <Link
            href="/"
            className={
              pathname === "/" ? "wen-nav-item-active" : "wen-nav-item"
            }
          >
            项目列表
          </Link>
          <Link
            href="/style-extract"
            className={
              pathname === "/style-extract"
                ? "wen-nav-item-active"
                : "wen-nav-item"
            }
          >
            风格提取
          </Link>

          {currentProject && (
            <div className="mt-5 pt-4 border-t border-surface-300">
              {(() => {
                const ct = (currentProject.contentType ||
                  "article") as ContentType;
                const steps = getContentTypeSteps(ct);
                return steps.map((step) => {
                  const isActive = currentStep === step.id;
                  const stepPath = getStepPath(step.id, currentProject._id, ct);

                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => {
                        setCurrentStep(step.id);
                        router.push(stepPath);
                      }}
                      className={
                        isActive ? "wen-nav-step-active" : "wen-nav-step-item"
                      }
                    >
                      <span className="truncate block">{step.name}</span>
                    </button>
                  );
                });
              })()}
            </div>
          )}
        </nav>

        <div className="border-t border-surface-300 shrink-0 text-[12px] text-ink-500">
          {currentProject && (
            <div className="flex border-b border-surface-300">
              <button
                type="button"
                onClick={handleImportMD}
                className="flex-1 py-2 hover:text-ink-900 transition-colors"
              >
                导入
              </button>
              <div className="w-px bg-surface-300" />
              <button
                type="button"
                onClick={handleExportMD}
                className="flex-1 py-2 hover:text-ink-900 transition-colors"
              >
                导出
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setShowSettings(true);
              if (sidebarOpen) toggleSidebar();
            }}
            className="w-full px-3 py-2 text-left hover:text-ink-900 transition-colors border-t border-surface-300"
          >
            设置
          </button>

          {currentProject && (
            <div className="px-3 py-2.5 border-t border-surface-300">
              <p className="text-[10px] text-ink-300 mb-0.5">当前项目</p>
              <p className="text-[13px] font-kaiti text-ink-800 truncate leading-snug">
                {currentProject.title}
              </p>
            </div>
          )}
        </div>
      </aside>

      {showFilePicker && (
        <div className="fixed inset-0 bg-black/15 flex items-center justify-center z-[60] p-4">
          <div className="bg-surface-100 max-w-md w-full max-h-[80vh] overflow-hidden border border-surface-300">
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-300">
              <h3 className="wen-title">选择文件</h3>
              <button
                type="button"
                onClick={() => setShowFilePicker(false)}
                className="p-1 text-ink-400 hover:text-ink-700"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[60vh]">
              {workspaceFiles.map((file) => (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => handleSelectWorkspaceFile(file)}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-surface-200/50 transition-colors border-b border-surface-300 last:border-b-0"
                >
                  <FileText
                    size={15}
                    className="text-ink-300"
                    strokeWidth={1.5}
                  />
                  <span className="flex-1 text-[13px] font-kaiti text-ink-700 truncate">
                    {file.name}
                  </span>
                  <ChevronRight
                    size={14}
                    className="text-ink-200"
                    strokeWidth={1.5}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
