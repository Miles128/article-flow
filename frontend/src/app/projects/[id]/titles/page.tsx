"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { writingApi, outlineApi, projectsApi } from "@/lib/api/client";
import { getDraftContent, getSelectedTopic } from "@/lib/contentFlow";
import { StepPageFrame } from "@/components/layout/StepPageFrame";
import { useStepFromRoute } from "@/lib/hooks/useStepFromRoute";
import { useProjectStyleProfile } from "@/lib/hooks/useProjectStyleProfile";
import {
  Type,
  Sparkles,
  Loader2,
  Star,
  Copy,
  Check,
  BookOpen,
  MessageCircle,
  Heart,
  Tv,
  FileText,
  Newspaper,
  Globe,
  Award,
  ExternalLink,
} from "lucide-react";
import { clsx } from "clsx";

interface TitleResult {
  title: string;
  subtitle: string;
  hook: string;
  coverLine: string;
}

const PLATFORMS = [
  { id: "wechat", name: "公众号", icon: MessageCircle },
  { id: "zhihu", name: "知乎", icon: BookOpen },
  { id: "xiaohongshu", name: "小红书", icon: Heart },
  { id: "bilibili", name: "B站", icon: Tv },
  { id: "jianshu", name: "简书", icon: FileText },
  { id: "toutiao", name: "头条", icon: Newspaper },
  { id: "general", name: "通用", icon: Globe },
];

const COUNTS = [3, 5, 7, 10];

export default function TitlesPage() {
  const params = useParams();
  const { currentProject, setCurrentProject } = useAppStore();
  const { stepId } = useStepFromRoute();
  const { styleProfileId } = useProjectStyleProfile();

  const [topic, setTopic] = useState("");
  const [outline, setOutline] = useState("");
  const [draftExcerpt, setDraftExcerpt] = useState("");
  const [platform, setPlatform] = useState("wechat");
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TitleResult[]>([]);
  const [recommendedIndex, setRecommendedIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Load project context on mount
  useEffect(() => {
    if (!params.id) return;
    const projectId = params.id as string;

    (async () => {
      // Load selected topic
      const sel = await getSelectedTopic(projectId);
      if (sel) {
        setTopic(`${sel.title}${sel.description ? ` — ${sel.description}` : ""}`);
      }

      // Load outline
      try {
        const outlineResp = await outlineApi.getByProject(projectId);
        const nodes = outlineResp.data?.nodes || [];
        if (nodes.length > 0) {
          const md = nodes
            .map((n: { title: string; content?: string }) => {
              const body = n.content ? `\n${n.content}` : "";
              return `- ${n.title}${body}`;
            })
            .join("\n");
          setOutline(md);
        }
      } catch {
        /* outline optional */
      }

      // Load draft excerpt
      try {
        const draft = await getDraftContent(projectId);
        if (draft) {
          setDraftExcerpt(draft.slice(0, 2000) + (draft.length > 2000 ? "..." : ""));
        }
      } catch {
        /* draft optional */
      }
    })();
  }, [params.id]);

  const generate = useCallback(async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const resp = await writingApi.titleWorkshop({
        topic: topic.trim(),
        outline,
        draftExcerpt,
        count,
        platform,
        styleProfileId: styleProfileId || undefined,
      });
      const data = resp.data as { titles?: TitleResult[]; recommendedIndex?: number; rawResult?: string };
      if (data.titles?.length) {
        setResults(data.titles);
        setRecommendedIndex(data.recommendedIndex ?? 0);
      } else if (data.rawResult) {
        setError("AI 返回格式异常，请重试");
      } else {
        setError("未生成标题，请检查网络或稍后重试");
      }
    } catch (err: unknown) {
      const e = err as { friendlyMessage?: string; response?: { data?: { error?: string } } };
      setError(
        e.friendlyMessage || e.response?.data?.error || "标题生成失败，请稍后重试"
      );
    } finally {
      setLoading(false);
    }
  }, [topic, outline, draftExcerpt, count, platform, styleProfileId]);

  const selectTitle = useCallback(
    async (index: number) => {
      if (!currentProject || !params.id) return;
      const result = results[index];
      if (!result) return;

      setSaving(true);
      try {
        await projectsApi.update(currentProject._id, {
          selectedTitle: result.title,
          coverLine: result.coverLine,
        });
        setCurrentProject({
          ...currentProject,
          selectedTitle: result.title,
          coverLine: result.coverLine,
        });
        setSelectedId(index);
      } catch {
        /* ignore */
      } finally {
        setSaving(false);
      }
    },
    [currentProject, params.id, results, setCurrentProject]
  );

  const copyTitle = useCallback(async (index: number) => {
    const result = results[index];
    if (!result) return;
    const text = [result.title, result.subtitle && `副标题：${result.subtitle}`, result.coverLine && `封面文案：${result.coverLine}`]
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(index);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      /* clipboard may not be available */
    }
  }, [results]);

  return (
    <StepPageFrame
      wide
      title="标题工坊"
      subtitle="生成爆款标题、副标题和封面文案"
      stepId={stepId}
    >
      {/* Input Section */}
      <div className="wen-panel-padded mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: inputs */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">
                文章主题 *
              </label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="输入文章的核心主题或一句话概括..."
                rows={3}
                className="w-full px-4 py-2.5 border border-surface-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">
                大纲（自动读取）
              </label>
              <textarea
                value={outline}
                onChange={(e) => setOutline(e.target.value)}
                placeholder="从大纲步骤自动加载，也可手动编辑..."
                rows={4}
                className="w-full px-4 py-2.5 border border-surface-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none text-sm text-ink-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">
                草稿摘要（自动读取前 2000 字）
              </label>
              <textarea
                value={draftExcerpt}
                onChange={(e) => setDraftExcerpt(e.target.value)}
                placeholder="从草稿步骤自动加载，也可手动粘贴..."
                rows={3}
                className="w-full px-4 py-2.5 border border-surface-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none text-sm text-ink-500"
              />
            </div>
          </div>

          {/* Right: settings + generate */}
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-2">
                目标平台
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PLATFORMS.map((p) => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setPlatform(p.id)}
                      className={clsx(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border transition-colors",
                        platform === p.id
                          ? "border-primary-500 bg-primary-50 text-primary-700"
                          : "border-surface-300 text-ink-600 hover:border-surface-400"
                      )}
                    >
                      <Icon size={14} />
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-700 mb-2">
                生成数量
              </label>
              <div className="flex gap-2">
                {COUNTS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCount(c)}
                    className={clsx(
                      "px-4 py-2 border-2 text-sm font-medium transition-colors",
                      count === c
                        ? "border-primary-500 bg-primary-50 text-primary-700"
                        : "border-surface-300 text-ink-600 hover:border-surface-400"
                    )}
                  >
                    {c} 个
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={generate}
              disabled={!topic.trim() || loading}
              className="wen-btn-seal w-full justify-center gap-2 py-2.5 text-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  生成标题
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-ink-500 uppercase tracking-wide mb-1">
            生成结果
          </h2>
          {results.map((result, idx) => {
            const isRecommended = idx === recommendedIndex;
            const isSelected = idx === selectedId;
            return (
              <div
                key={idx}
                className={clsx(
                  "wen-panel-padded border-2 transition-all",
                  isRecommended
                    ? "border-accent-300 bg-accent-50/30"
                    : isSelected
                      ? "border-primary-300 bg-primary-50/30"
                      : "border-surface-300 hover:border-primary-200"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    {/* Title row */}
                    <div className="flex items-center gap-2 mb-1.5">
                      {isRecommended && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-100 text-accent-700 text-xs font-medium">
                          <Award size={12} />
                          推荐
                        </span>
                      )}
                      {isSelected && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium">
                          <Star size={12} />
                          已选用
                        </span>
                      )}
                      <span className="text-xs text-ink-400">#{idx + 1}</span>
                    </div>

                    {/* Main title */}
                    <h3 className="text-lg font-bold text-ink-900 mb-1">
                      {result.title}
                    </h3>

                    {/* Subtitle */}
                    {result.subtitle && (
                      <p className="text-sm text-ink-600 mb-2">
                        副标题：{result.subtitle}
                      </p>
                    )}

                    {/* Hook */}
                    {result.hook && (
                      <p className="text-xs text-ink-400 mb-2 flex items-center gap-1">
                        <ExternalLink size={11} />
                        点击理由：{result.hook}
                      </p>
                    )}

                    {/* Cover line */}
                    {result.coverLine && (
                      <p className="text-sm text-primary-600 font-medium bg-primary-50/50 px-3 py-1.5 inline-block">
                        🖼 封面文案：{result.coverLine}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => copyTitle(idx)}
                      className="p-2 text-ink-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                      title="复制"
                    >
                      {copiedId === idx ? (
                        <Check size={16} className="text-green-500" />
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>
                    {!isSelected && (
                      <button
                        onClick={() => selectTitle(idx)}
                        disabled={saving}
                        className="p-2 text-ink-400 hover:text-accent-600 hover:bg-accent-50 rounded transition-colors disabled:opacity-50"
                        title="选用此标题"
                      >
                        <Star size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && results.length === 0 && !error && (
        <div className="wen-panel-padded p-16 text-center">
          <Type className="w-16 h-16 text-ink-300 mx-auto mb-4" />
          <h3 className="wen-title">标题工坊</h3>
          <p className="text-ink-500 mb-2">
            输入文章主题，AI 将生成爆款标题、副标题和封面文案
          </p>
          <p className="text-xs text-ink-400">
            支持 7 个平台风格 · 可选 3-10 个标题
          </p>
        </div>
      )}
    </StepPageFrame>
  );
}
