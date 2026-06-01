"use client";

import { useEffect, useState } from "react";
import { writingApi } from "@/lib/api/client";
import { streamWritingAi } from "@/lib/writingStream";
import { getApiError } from "@/lib/apiError";
import { showToast } from "@/components/ui/Toast";
import { Loader2, Play, RotateCcw, ChevronRight } from "lucide-react";
import { clsx } from "clsx";

interface Section {
  id: string | number;
  title: string;
  sectionType: string;
  level: number;
  content?: string;
}

interface SectionWriterPanelProps {
  projectId: string;
  draftContent?: string;
  onAppend: (text: string) => void;
  styleProfileId?: string;
}

export function SectionWriterPanel({
  projectId,
  draftContent = "",
  onAppend,
  styleProfileId,
}: SectionWriterPanelProps) {
  const [sections, setSections] = useState<Section[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [sectionContent, setSectionContent] = useState("");
  const [judgeResult, setJudgeResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    writingApi
      .getSectionDraft(projectId)
      .then((r) => {
        setSections(r.data.sections || []);
      })
      .catch(() => setSections([]));
  }, [projectId]);

  const current = sections[activeIdx];

  async function generateCurrent() {
    if (!current) return;
    setLoading(true);
    setJudgeResult(null);
    try {
      const text = await streamWritingAi(
        {
          action: "generate_section",
          sectionTitle: current.title,
          sectionType: current.sectionType,
          sectionBrief: current.content,
          projectId,
          styleProfileId,
          context: { priorSections: draftContent },
        },
        { onDelta: (streamed) => setSectionContent(streamed) },
      );
      if (!text.trim()) {
        showToast("error", "本节生成结果为空");
      }
    } catch (error: unknown) {
      showToast("error", getApiError(error, "生成本节失败"));
    } finally {
      setLoading(false);
    }
  }

  async function judgeCurrent() {
    if (!sectionContent.trim() || !current) return;
    setLoading(true);
    try {
      const resp = await writingApi.judgeSection(sectionContent, current.title);
      setJudgeResult(resp.data);
    } finally {
      setLoading(false);
    }
  }

  async function reviseCurrent() {
    if (!sectionContent.trim() || !current) return;
    setLoading(true);
    try {
      const resp = await writingApi.reviseSection({
        content: sectionContent,
        sectionTitle: current.title,
        issues: judgeResult?.issues || [],
        previousScore: judgeResult?.overallScore,
        projectId,
        styleProfileId,
      });
      if (!resp.data.degraded) {
        setSectionContent(resp.data.content);
      }
      setJudgeResult((prev: any) =>
        prev
          ? {
              ...prev,
              degraded: resp.data.degraded,
              revised: resp.data.revised,
            }
          : null,
      );
    } finally {
      setLoading(false);
    }
  }

  function appendToDraft() {
    if (sectionContent.trim()) onAppend(sectionContent);
    if (activeIdx < sections.length - 1) {
      setActiveIdx(activeIdx + 1);
      setSectionContent("");
      setJudgeResult(null);
    }
  }

  if (sections.length === 0) {
    return (
      <p className="text-sm text-ink-500 p-4 border bg-surface-200/30">
        请先在「列出大纲」步骤创建章节；可为每节标记「信息型」或「经验型」。
      </p>
    );
  }

  return (
    <div className=" border border-blue-200 bg-blue-50/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="wen-title">按节写作</h3>
        <span className="text-xs text-ink-500">
          {activeIdx + 1}/{sections.length}
        </span>
      </div>

      <div className="flex flex-wrap gap-1">
        {sections.map((s, i) => (
          <button
            key={String(s.id)}
            onClick={() => {
              setActiveIdx(i);
              setSectionContent("");
              setJudgeResult(null);
            }}
            className={clsx(
              "text-xs px-2 py-1 rounded border",
              i === activeIdx
                ? "bg-blue-50 text-blue-700 border-blue-400"
                : "bg-surface-50/70 backdrop-blur-[3px] border-surface-300",
            )}
          >
            {s.sectionType === "experience" ? "✍️" : "🤖"} {s.title.slice(0, 8)}
          </button>
        ))}
      </div>

      {current && (
        <p className="text-sm font-medium text-ink-800">
          {current.title}
          <span className="ml-2 text-xs text-ink-500">
            {current.sectionType === "experience"
              ? "经验型（你写）"
              : "信息型（AI写）"}
          </span>
        </p>
      )}

      <textarea
        value={sectionContent}
        onChange={(e) => setSectionContent(e.target.value)}
        rows={8}
        className="w-full text-sm border border-surface-300 p-2 font-mono"
        placeholder="生成本节内容..."
      />

      <div className="flex flex-wrap gap-2">
        <button
          onClick={generateCurrent}
          disabled={loading || current?.sectionType === "experience"}
          className="text-xs px-3 py-1.5 wen-btn-action-accent disabled:opacity-50 flex items-center gap-1"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={12} />
          ) : (
            <Play size={12} />
          )}
          生成本节
        </button>
        <button
          onClick={judgeCurrent}
          disabled={loading || !sectionContent.trim()}
          className="text-xs px-3 py-1.5 border hover:bg-surface-50/70"
        >
          评分
        </button>
        <button
          onClick={reviseCurrent}
          disabled={loading || !sectionContent.trim()}
          className="text-xs px-3 py-1.5 border hover:bg-surface-50/75 flex items-center gap-1"
        >
          <RotateCcw size={12} /> 修订
        </button>
        <button
          onClick={appendToDraft}
          disabled={!sectionContent.trim()}
          className="text-xs px-3 py-1.5 wen-btn-action text-green-700 border-green-300 bg-green-50 hover:bg-green-100 flex items-center gap-1 ml-auto"
        >
          并入草稿 <ChevronRight size={12} />
        </button>
      </div>

      {judgeResult?.overallScore !== undefined && (
        <p className="text-xs text-ink-600">
          评分: {judgeResult.overallScore}/100
          {judgeResult.shouldRevise && " · 建议修订"}
          {judgeResult.degraded && " · 已回滚（质量下降）"}
        </p>
      )}
    </div>
  );
}
