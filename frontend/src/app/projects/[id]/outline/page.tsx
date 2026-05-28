"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { outlineApi, contentApi } from "@/lib/api/client";
import { importContentFromFile, getSelectedTopic } from "@/lib/contentFlow";
import { buildTopicSearchQuery } from "@/lib/searchQuery";
import { StepPageFrame } from "@/components/layout/StepPageFrame";
import { useStepFromRoute } from "@/lib/hooks/useStepFromRoute";
import type { OutlineNode } from "@/types";
import {
  ListOrdered,
  Plus,
  Trash2,
  GripVertical,
  Sparkles,
  Loader2,
  ChevronRight,
  ChevronDown,
  FolderOpen,
} from "lucide-react";
import { clsx } from "clsx";
import { showToast } from "@/components/ui/Toast";

function OutlineNodeItem({
  node,
  level,
  onUpdate,
  onUpdateSectionType,
  onDelete,
  onAddChild,
}: {
  node: OutlineNode;
  level: number;
  onUpdate: (id: string | number, title: string) => void;
  onUpdateSectionType: (
    id: string | number,
    sectionType: "info" | "experience",
  ) => void;
  onDelete: (id: string | number) => void;
  onAddChild: (parentId: string | number) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(node.title);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="select-none">
      <div
        className={clsx(
          "group flex items-center gap-2 py-2 px-3 hover:bg-surface-50/70 transition-colors",
          { "ml-6": level > 0 },
        )}
      >
        <GripVertical
          size={16}
          className="text-ink-200 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
        />

        {hasChildren ? (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-ink-300 hover:text-ink-500 hover:bg-surface-50/75 rounded"
          >
            {isExpanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
          </button>
        ) : (
          <div className="w-6" />
        )}

        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={() => {
              onUpdate(node.id, editTitle);
              setIsEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onUpdate(node.id, editTitle);
                setIsEditing(false);
              }
            }}
            className="flex-1 px-2 py-1 border border-surface-200 rounded focus:ring-2 focus:ring-primary-300 outline-none text-sm"
            autoFocus
          />
        ) : (
          <span
            onClick={() => {
              setEditTitle(node.title);
              setIsEditing(true);
            }}
            className="flex-1 text-sm cursor-text text-ink-700"
          >
            {node.title}
          </span>
        )}

        <select
          value={node.sectionType || "info"}
          onChange={(e) =>
            onUpdateSectionType(
              node.id,
              e.target.value as "info" | "experience",
            )
          }
          className="border border-surface-300 rounded px-1 py-0.5 opacity-0 group-hover:opacity-100"
          title="章节类型：信息型由 AI 写，经验型由你写"
        >
          <option value="info">信息型</option>
          <option value="experience">经验型</option>
        </select>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onAddChild(node.id)}
            className="p-1.5 text-ink-300 hover:text-forest-600 hover:bg-forest-50 rounded"
            title="添加子节点"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={() => onDelete(node.id)}
            className="p-1.5 text-ink-300 hover:text-red-600 hover:bg-red-50 rounded"
            title="删除节点"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {node.children?.map((child) => (
            <OutlineNodeItem
              key={child.id}
              node={child}
              level={level + 1}
              onUpdate={onUpdate}
              onUpdateSectionType={onUpdateSectionType}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function OutlinePage() {
  const params = useParams();
  const { currentProject } = useAppStore();
  const { stepId } = useStepFromRoute();
  const [outline, setOutline] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<any[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateTopic, setGenerateTopic] = useState("");
  const [frameworks, setFrameworks] = useState<
    Array<{
      id: string;
      name: string;
      best_for: string[];
      sections: Array<{ title: string; hint: string }>;
    }>
  >([]);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadOutline();
    loadTemplates();
    loadSelectedTopic();
    contentApi
      .getFrameworks()
      .then((r) => setFrameworks(r.data.frameworks || []))
      .catch(() => {});
  }, [params.id]);

  async function loadSelectedTopic() {
    if (!params.id) return;
    const topic = await getSelectedTopic(params.id as string);
    if (topic) setGenerateTopic(buildTopicSearchQuery(topic));
  }

  async function loadOutline() {
    if (!params.id) return;
    try {
      setLoading(true);
      const response = await outlineApi.getByProject(params.id as string);
      setOutline(response.data);
    } catch (error) {
      console.error("Failed to load outline:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadTemplates() {
    try {
      const response = await outlineApi.getTemplates();
      setTemplates(response.data);
    } catch (error) {
      console.error("Failed to load templates:", error);
    }
  }

  async function saveOutline(data: any) {
    if (!params.id) return;
    try {
      await outlineApi.createOrUpdate({
        projectId: params.id as string,
        title: data.title || "文章大纲",
        nodes: data.nodes || [],
      });
    } catch (error) {
      console.error("Failed to save outline:", error);
    }
  }

  function debouncedSave(data: any) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveOutline(data), 1000);
  }

  async function generateOutline() {
    if (!generateTopic.trim()) {
      setGenerateError("请输入文章主题");
      return;
    }
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const response = await outlineApi.generate({
        topic: generateTopic,
        targetWordCount: currentProject?.targetWordCount || 2000,
      });
      setOutline(response.data);
      saveOutline(response.data);
    } catch (error: any) {
      setGenerateError(error.friendlyMessage || "生成大纲失败，请重试");
    } finally {
      setIsGenerating(false);
    }
  }

  function addNode(parentId?: string | number) {
    const newNode: OutlineNode = {
      id: Date.now(),
      title: "新节点",
      content: "",
      sectionType: "info",
      children: [],
    };

    let newOutline: any;
    if (outline) {
      newOutline = { ...outline };
      if (parentId) {
        const addToParent = (nodes: OutlineNode[]): OutlineNode[] => {
          return nodes.map((node) => {
            if (node.id === parentId) {
              return { ...node, children: [...(node.children || []), newNode] };
            }
            if (node.children) {
              return { ...node, children: addToParent(node.children) };
            }
            return node;
          });
        };
        newOutline.nodes = addToParent(newOutline.nodes || []);
      } else {
        const topCount = (newOutline.nodes || []).length;
        if (topCount >= 12) {
          showToast("error", "二级章节（顶层）最多 12 个，请合并章节或改为子要点");
          return;
        }
        newOutline.nodes = [...(newOutline.nodes || []), newNode];
      }
    } else {
      newOutline = { title: "文章大纲", nodes: [newNode] };
    }
    setOutline(newOutline);
    debouncedSave(newOutline);
  }

  function updateSectionType(
    id: string | number,
    sectionType: "info" | "experience",
  ) {
    if (!outline) return;
    const updateRecursive = (nodes: OutlineNode[]): OutlineNode[] => {
      return nodes.map((node) => {
        if (node.id === id) return { ...node, sectionType };
        if (node.children)
          return { ...node, children: updateRecursive(node.children) };
        return node;
      });
    };
    const newOutline = {
      ...outline,
      nodes: updateRecursive(outline.nodes || []),
    };
    setOutline(newOutline);
    debouncedSave(newOutline);
  }

  function updateNode(id: string | number, title: string) {
    if (!outline) return;
    const updateRecursive = (nodes: OutlineNode[]): OutlineNode[] => {
      return nodes.map((node) => {
        if (node.id === id) return { ...node, title };
        if (node.children)
          return { ...node, children: updateRecursive(node.children) };
        return node;
      });
    };
    const newOutline = {
      ...outline,
      nodes: updateRecursive(outline.nodes || []),
    };
    setOutline(newOutline);
    debouncedSave(newOutline);
  }

  function deleteNode(id: string | number) {
    if (!outline) return;
    const deleteRecursive = (nodes: OutlineNode[]): OutlineNode[] => {
      return nodes
        .filter((node) => node.id !== id)
        .map((node) => {
          if (node.children)
            return { ...node, children: deleteRecursive(node.children) };
          return node;
        });
    };
    const newOutline = {
      ...outline,
      nodes: deleteRecursive(outline.nodes || []),
    };
    setOutline(newOutline);
    debouncedSave(newOutline);
  }

  function applyFramework(fw: {
    id: string;
    name: string;
    sections: Array<{ title: string; hint: string }>;
  }) {
    const nodes: OutlineNode[] = fw.sections.map((s, i) => ({
      id: Date.now() + i,
      title: s.title,
      content: s.hint || "",
      sectionType: "info" as const,
      children: [],
    }));
    const newOutline = {
      ...(outline || { title: "文章大纲" }),
      title: fw.name,
      frameworkId: fw.id,
      nodes,
    };
    setOutline(newOutline);
    saveOutline(newOutline);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin h-8 w-8 text-ink-300 mx-auto" />
      </div>
    );
  }

  return (
    <StepPageFrame
      wide
      title="列出大纲"
      subtitle="AI 生成 + 手动编辑"
      stepId={stepId}
      actions={
        <>
          <button
            onClick={async () => {
              const imported = await importContentFromFile();
              if (imported?.trim()) {
                const lines = imported.split("\n");
                const nodes: OutlineNode[] = [];
                lines.forEach((line, idx) => {
                  const trimmed = line.trim();
                  if (trimmed) {
                    nodes.push({
                      id: Date.now() + idx,
                      title: trimmed.replace(/^#+\s*/, ""),
                      content: "",
                      children: [],
                    });
                  }
                });
                if (nodes.length > 0) {
                  const newOutline = { title: "导入大纲", nodes };
                  setOutline(newOutline);
                  debouncedSave(newOutline);
                }
              }
            }}
            className="wen-btn text-xs inline-flex items-center gap-1"
          >
            <FolderOpen size={12} />
            导入
          </button>
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="wen-btn text-xs inline-flex items-center gap-1"
          >
            <ListOrdered size={12} />
            模板
          </button>
          <button
            onClick={() => addNode()}
            className="wen-btn-seal text-xs inline-flex items-center gap-1"
          >
            <Plus size={12} />
            添加
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <div className="bg-surface-50/65 backdrop-blur-[3px] border border-surface-200 p-5">
            {!outline || !outline.nodes || outline.nodes.length === 0 ? (
              <div className="text-center py-16">
                <ListOrdered className="w-12 h-12 text-ink-200 mx-auto mb-3" />
                <h3 className="wen-title text-ink-700 mb-1">
                  还没有大纲
                </h3>
                <p className="text-ink-400 mb-5">
                  使用 AI 生成或手动创建大纲
                </p>
                <button
                  onClick={() => addNode()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 wen-btn-seal font-medium"
                >
                  <Plus size={14} />
                  创建第一个节点
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="mb-3 pb-2 border-b border-surface-200">
                  <h3 className="wen-title text-ink-800 ">
                    {outline.title || "文章大纲"}
                  </h3>
                  <p className="text-xs text-ink-400 mt-1">
                    顶层章节（二级）最多 12 个；子要点请放在节点下。写稿时章节标题会内化进正文，不使用 ##。
                  </p>
                </div>
                {outline.nodes?.map((node: OutlineNode) => (
                  <OutlineNodeItem
                    key={node.id}
                    node={node}
                    level={0}
                    onUpdate={updateNode}
                    onUpdateSectionType={updateSectionType}
                    onDelete={deleteNode}
                    onAddChild={addNode}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          {frameworks.length > 0 && (
            <div className="bg-surface-50/65 backdrop-blur-[3px] border border-surface-200 p-5">
              <h3 className="wen-title text-ink-800 mb-3 ">
                写作框架
              </h3>
              <div className="space-y-2">
                {frameworks.map((fw) => (
                  <button
                    key={fw.id}
                    onClick={() => applyFramework(fw)}
                    className="w-full text-left px-3 py-2 border border-surface-200 hover:border-primary-300 hover:bg-primary-50/50 "
                  >
                    <span className="font-medium text-ink-800">{fw.name}</span>
                    <span className="block text-ink-400 mt-0.5">
                      {fw.best_for?.join(" · ")}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="bg-surface-50/65 backdrop-blur-[3px] border border-surface-200 p-5">
            <h3 className="wen-title text-ink-800 mb-3 flex items-center gap-1.5 ">
              <Sparkles size={16} className="text-primary-500" />
              AI 生成大纲
            </h3>
            <div className="space-y-2.5">
              <textarea
                value={generateTopic}
                onChange={(e) => setGenerateTopic(e.target.value)}
                placeholder="输入文章主题，让 AI 帮你生成大纲..."
                rows={4}
                className="w-full px-3 py-2 border border-surface-200 focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none resize-none bg-surface-50/65 backdrop-blur-[3px]"
              />
              <button
                onClick={generateOutline}
                disabled={isGenerating || !generateTopic.trim()}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 wen-btn-seal disabled:opacity-40 font-medium"
              >
                {isGenerating ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : (
                  <Sparkles size={14} />
                )}
                生成大纲
              </button>
              {generateError && (
                <p className="text-red-600 mt-1">{generateError}</p>
              )}
            </div>
          </div>

          {showTemplates && (
            <div className="bg-surface-50/65 backdrop-blur-[3px] border border-surface-200 p-5">
              <h3 className="wen-title text-ink-800 mb-3 ">
                大纲模板
              </h3>
              <div className="space-y-2">
                {templates.map((template, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      const newOutline = {
                        title: template.name,
                        nodes: template.structure,
                      };
                      setOutline(newOutline);
                      setShowTemplates(false);
                      debouncedSave(newOutline);
                    }}
                    className="w-full text-left px-3 py-2.5 border border-surface-200 hover:border-primary-300 hover:bg-primary-50 transition-all"
                  >
                    <p className="font-medium text-ink-800 ">
                      {template.name}
                    </p>
                    <p className="text-ink-400 mt-0.5">
                      {template.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="bg-surface-50/65 backdrop-blur-[3px] border border-surface-200 p-5">
            <h3 className="wen-title text-ink-800 mb-3 ">
              操作提示
            </h3>
            <div className="space-y-2.5 text-ink-500">
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded bg-primary-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="font-bold text-primary-500">
                    1
                  </span>
                </div>
                <span>点击节点文字进行编辑</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded bg-primary-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="font-bold text-primary-500">
                    2
                  </span>
                </div>
                <span>点击 + 按钮添加子节点</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded bg-primary-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="font-bold text-primary-500">
                    3
                  </span>
                </div>
                <span>编辑后自动保存到后端</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StepPageFrame>
  );
}
