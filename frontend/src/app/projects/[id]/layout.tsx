"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useAppStore } from "@/lib/store";
import { projectsApi } from "@/lib/api/client";
import type { Project } from "@/types";
import { ArrowLeft, Loader2, Pencil } from "lucide-react";
import Link from "next/link";
import { ProjectHeaderWritingExtras } from "@/components/layout/ProjectHeaderWritingExtras";

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const isWritingPage = pathname?.includes("/writing");
  const router = useRouter();
  const { currentProject, setCurrentProject } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);

  const projectId = params.id as string;

  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
    }

    return () => {
      setCurrentProject(null);
      useAppStore.getState().setDraftStatusText(null);
    };
  }, [projectId]);

  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingTitle]);

  async function handleTitleSave() {
    setEditingTitle(false);
    if (
      !currentProject ||
      !titleValue.trim() ||
      titleValue === currentProject.title
    )
      return;
    try {
      await projectsApi.update(currentProject._id, {
        title: titleValue.trim(),
      });
      setCurrentProject({ ...currentProject, title: titleValue.trim() });
    } catch (e) {
      console.error("Failed to update title:", e);
    }
  }

  async function loadProject(id: string) {
    try {
      setLoading(true);
      const response = await projectsApi.getById(id);
      setCurrentProject(response.data);
      setError(null);
    } catch (err) {
      console.error("Failed to load project:", err);
      setError("项目加载失败");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-primary-500 mx-auto mb-4" />
          <p className="text-ink-500">加载项目...</p>
        </div>
      </div>
    );
  }

  if (error || !currentProject) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-200/30">
        <div className="text-center">
          <p className="text-ink-500 mb-4">{error || "项目不存在"}</p>
          <Link href="/" className="wen-btn-seal transition-colors">
            <ArrowLeft size={18} />
            返回项目列表
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AppShell
      headerBorderless={isWritingPage}
      header={
        <div
          className={
            isWritingPage
              ? "w-full flex items-center justify-between gap-4 px-3 py-2 min-w-0"
              : "max-w-4xl mx-auto flex items-center gap-2 px-6 py-4"
          }
        >
          <div className="min-w-0 shrink">
            {editingTitle ? (
              <input
                ref={titleInputRef}
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleSave();
                  if (e.key === "Escape") setEditingTitle(false);
                }}
                className="wen-title border-b border-primary-500 outline-none bg-transparent max-w-md w-full"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setTitleValue(currentProject.title);
                  setEditingTitle(true);
                }}
                className="wen-title hover:text-primary-600 transition-colors flex items-center gap-1.5 group text-left truncate max-w-full"
              >
                <span className="truncate">{currentProject.title}</span>
                <Pencil
                  size={13}
                  strokeWidth={1.5}
                  className="text-ink-300 group-hover:text-primary-400 transition-colors shrink-0"
                />
              </button>
            )}
          </div>
          {isWritingPage ? (
            <ProjectHeaderWritingExtras />
          ) : null}
        </div>
      }
    >
      {children}
    </AppShell>
  );
}
