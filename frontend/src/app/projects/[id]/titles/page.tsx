"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAppStore } from "@/lib/store";
import {
  writingApi,
  projectsApi,
  outlineApi,
  contentApi,
} from "@/lib/api/client";
import { getDraftContent, getSelectedTopic } from "@/lib/contentFlow";
import { StepPageFrame } from "@/components/layout/StepPageFrame";
import { useStepFromRoute } from "@/lib/hooks/useStepFromRoute";
import { getApiError } from "@/lib/apiError";
import { showToast } from "@/components/ui/Toast";
import { Loader2, Sparkles, Check } from "lucide-react";
import { clsx } from "clsx";

interface TitleItem {
  title: string;
  subtitle?: string;
  hook?: string;
  coverLine?: string;
}

export default function TitlesPage() {
  const params = useParams();
  const { currentProject } = useAppStore();
  const { stepId } = useStepFromRoute();
  const [topic, setTopic] = useState("");
  const [outline, setOutline] = useState("");
  const [draftExcerpt, setDraftExcerpt] = useState("");
  const [titles, setTitles] = useState<TitleItem[]>([]);
  const [recommendedIndex, setRecommendedIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [platform, setPlatform] = useState("wechat");

  useEffect(() => {
    loadContext();
  }, [params.id]);

  async function loadContext() {
    if (!params.id) return;
    const topicInfo = await getSelectedTopic(params.id as string);
    if (topicInfo) setTopic(topicInfo.title);
    else if (currentProject?.title) setTopic(currentProject.title);

    try {
      const outlineResp = await outlineApi.getByProject(params.id as string);
      const nodes = outlineResp.data?.nodes || [];
      const md = nodes.map((n: { title: string }) => `- ${n.title}`).join("\n");
      setOutline(md);
    } catch {}

    const draft = await getDraftContent(params.id as string);
    setDraftExcerpt(draft.slice(0, 1500));

    if (currentProject?.selectedTitle) {
      setTitles([
        {
          title: currentProject.selectedTitle,
          coverLine: currentProject.coverLine || "",
        },
      ]);
      setSelectedIndex(0);
    }
  }

  async function generateTitles() {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      const resp = await writingApi.titleWorkshop({
        topic,
        outline,
        draftExcerpt,
        count: 8,
        platform,
        styleProfileId: currentProject?.styleProfileId || undefined,
      });
      const data = resp.data as {
        titles?: TitleItem[];
        recommendedIndex?: number;
      };
      setTitles(data.titles || []);
      setRecommendedIndex(data.recommendedIndex ?? 0);
      if (!(data.titles || []).length) {
        showToast("warning", "未生成标题，请重试");
      }
    } catch (e) {
      showToast("error", getApiError(e, "标题生成失败"));
    } finally {
      setLoading(false);
    }
  }

  async function applyTitle(idx: number) {
    const item = titles[idx];
    if (!item || !currentProject) return;
    setSelectedIndex(idx);
    await projectsApi.update(currentProject._id, {
      title: item.title,
      selectedTitle: item.title,
      coverLine: item.coverLine || item.subtitle || "",
    });
    if (params.id) {
      await projectsApi.createContent(params.id as string, {
        step: 6,
        content: JSON.stringify(
          { titles, selectedIndex: idx, selected: item },
          null,
          2,
        ),
        contentType: "json",
      });
      await contentApi.savePublishBundle({
        projectId: params.id as string,
        title: item.title,
        hook: item.hook || item.subtitle || "",
        digest: item.subtitle || "",
        coverLine: item.coverLine || "",
      });
    }
  }

  return (
    <StepPageFrame title="标题工坊" stepId={stepId}>
      <div className="wen-panel-padded border p-4 mb-4 space-y-3">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="w-full border px-3 py-2 text-sm"
          placeholder="选题 / 文章主题"
        />
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="border px-3 py-2 text-sm"
        >
          <option value="wechat">公众号</option>
          <option value="zhihu">知乎</option>
          <option value="xiaohongshu">小红书</option>
          <option value="general">通用</option>
        </select>
        <button
          onClick={generateTitles}
          disabled={loading || !topic.trim()}
          className="wen-btn-seal w-full justify-center py-2 flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <Sparkles size={18} />
          )}
          生成爆款标题（5-8 个）
        </button>
      </div>

      <div className="space-y-3">
        {titles.map((t, i) => (
          <div
            key={i}
            className={clsx(
              "p-4 border-2 transition-all",
              selectedIndex === i
                ? "border-green-400 bg-green-50"
                : i === recommendedIndex
                  ? "border-primary-300 bg-primary-50/50"
                  : "border-surface-300 bg-surface-100",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="wen-title text-ink-900">{t.title}</h3>
                {t.subtitle && (
                  <p className="text-sm text-ink-600 mt-1">{t.subtitle}</p>
                )}
                {t.hook && (
                  <p className="text-xs text-ink-400 mt-1">{t.hook}</p>
                )}
                {t.coverLine && (
                  <p className="text-xs text-purple-600 mt-2">
                    封面文案: {t.coverLine}
                  </p>
                )}
              </div>
              {i === recommendedIndex && (
                <span className="text-[10px] bg-primary-100 text-primary-700 px-2 py-0.5 rounded">
                  推荐
                </span>
              )}
            </div>
            <button
              onClick={() => applyTitle(i)}
              className="mt-3 text-xs px-3 py-1.5 bg-gray-900 text-white hover:bg-gray-800 flex items-center gap-1"
            >
              <Check size={12} /> 选用为项目标题
            </button>
          </div>
        ))}
      </div>
    </StepPageFrame>
  );
}
