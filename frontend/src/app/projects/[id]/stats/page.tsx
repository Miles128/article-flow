"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { statsApi } from "@/lib/api/client";
import { useStepFromRoute } from "@/lib/hooks/useStepFromRoute";
import { StepPageFrame } from "@/components/layout/StepPageFrame";
import {
  BarChart3,
  Loader2,
  Target,
  FileText,
  Hash,
  Clock,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Circle,
  GitCommit,
} from "lucide-react";
import { clsx } from "clsx";

interface VersionTrend {
  version: number;
  note: string;
  createdAt: string;
  aiScore: number;
  wordCount: number;
}

interface StepStatus {
  step: number;
  hasContent: boolean;
  contentCount: number;
}

interface ProjectStats {
  projectTitle: string;
  status: string;
  currentStep: number;
  targetWordCount: number;
  wordCount: number;
  aiTasteScore: number;
  aiTargetScore: number;
  aiMatchCount: number;
  versionCount: number;
  stepsStatus: StepStatus[];
  versionTrend: VersionTrend[];
  createdAt: string;
  updatedAt: string;
}

const STEP_NAMES: Record<number, string> = {
  1: "热搜选题",
  2: "确定选题",
  3: "搜集资料",
  4: "列出大纲",
  5: "写出草稿",
  6: "标题工坊",
  7: "修改审核",
  8: "格式处理",
  9: "生成配图",
  10: "发布准备",
};

function scoreToColor(score: number, target: number): string {
  if (score <= target) return "text-green-600";
  if (score <= target + 20) return "text-accent-500";
  return "text-red-500";
}

function scoreToBg(score: number, target: number): string {
  if (score <= target) return "bg-green-100";
  if (score <= target + 20) return "bg-accent-100";
  return "bg-red-100";
}

function formatDate(iso: string): string {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso.slice(0, 16);
  }
}

export default function StatsPage() {
  const params = useParams();
  const router = useRouter();
  const { currentProject } = useAppStore();
  const { stepId } = useStepFromRoute();

  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    setLoading(true);
    statsApi
      .getProjectStats(params.id as string)
      .then((r) => setStats(r.data as ProjectStats))
      .catch(() => setError("加载统计数据失败"))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin h-8 w-8 text-primary-500" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-ink-500">{error || "暂无数据"}</p>
      </div>
    );
  }

  const aiPassed = stats.aiTasteScore <= stats.aiTargetScore;
  const wordProgress = stats.targetWordCount > 0
    ? Math.min(100, Math.round((stats.wordCount / stats.targetWordCount) * 100))
    : 0;
  const completedSteps = stats.stepsStatus.filter((s) => s.hasContent).length;

  return (
    <StepPageFrame
      wide
      title="写作统计"
      subtitle={stats.projectTitle}
      stepId={stepId}
    >
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="wen-panel-padded text-center py-4">
          <FileText className="w-5 h-5 text-primary-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-ink-900">{stats.wordCount.toLocaleString()}</p>
          <p className="text-xs text-ink-500">总字数</p>
          {stats.targetWordCount > 0 && (
            <p className="text-xs text-ink-400 mt-0.5">
              目标 {stats.targetWordCount.toLocaleString()} ({wordProgress}%)
            </p>
          )}
        </div>

        <div className={clsx("wen-panel-padded text-center py-4", scoreToBg(stats.aiTasteScore, stats.aiTargetScore))}>
          <Zap className={clsx("w-5 h-5 mx-auto mb-2", scoreToColor(stats.aiTasteScore, stats.aiTargetScore))} />
          <p className={clsx("text-2xl font-bold", scoreToColor(stats.aiTasteScore, stats.aiTargetScore))}>
            {stats.aiTasteScore}
          </p>
          <p className="text-xs text-ink-500">
            AI 味评分 {aiPassed ? "✅" : "⚠️"}（目标 ≤{stats.aiTargetScore}）
          </p>
          <p className="text-xs text-ink-400 mt-0.5">命中 {stats.aiMatchCount} 处</p>
        </div>

        <div className="wen-panel-padded text-center py-4">
          <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-ink-900">
            {completedSteps}/{stats.stepsStatus.length}
          </p>
          <p className="text-xs text-ink-500">已完成步骤</p>
        </div>

        <div className="wen-panel-padded text-center py-4">
          <GitCommit className="w-5 h-5 text-accent-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-ink-900">{stats.versionCount}</p>
          <p className="text-xs text-ink-500">历史版本</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Steps Progress */}
        <div className="wen-panel-padded">
          <h3 className="text-sm font-semibold text-ink-700 mb-3 flex items-center gap-2">
            <Target size={16} />
            工作流进度
          </h3>
          <div className="space-y-1.5">
            {stats.stepsStatus.map((s) => (
              <div
                key={s.step}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors",
                  s.hasContent
                    ? "bg-green-50 text-ink-900"
                    : "bg-surface-200/30 text-ink-400"
                )}
              >
                {s.hasContent ? (
                  <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                ) : (
                  <Circle size={16} className="text-ink-300 shrink-0" />
                )}
                <span className="flex-1">
                  第 {s.step} 步：{STEP_NAMES[s.step] || "未知"}
                </span>
                {s.contentCount > 0 && (
                  <span className="text-xs text-ink-400">{s.contentCount} 条内容</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* AI Score Trend */}
        <div className="wen-panel-padded">
          <h3 className="text-sm font-semibold text-ink-700 mb-3 flex items-center gap-2">
            <BarChart3 size={16} />
            AI 味评分趋势
          </h3>
          {stats.versionTrend.length === 0 ? (
            <p className="text-sm text-ink-400 py-8 text-center">暂无版本数据</p>
          ) : (
            <div className="space-y-2">
              {stats.versionTrend.map((v, idx) => {
                const width = Math.min(100, Math.max(5, v.aiScore));
                return (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <span className="w-12 text-ink-400 shrink-0 text-right">
                      v{v.version}
                    </span>
                    <div className="flex-1 bg-surface-200/50 rounded-full h-4 overflow-hidden">
                      <div
                        className={clsx(
                          "h-full rounded-full transition-all",
                          scoreToBg(v.aiScore, stats.aiTargetScore).replace("bg-", "bg-").replace("-100", "-500")
                        )}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <span
                      className={clsx(
                        "w-6 font-mono font-bold shrink-0",
                        scoreToColor(v.aiScore, stats.aiTargetScore)
                      )}
                    >
                      {v.aiScore}
                    </span>
                    <span className="w-16 text-ink-400 shrink-0 text-right">
                      {v.wordCount.toLocaleString()}字
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Meta info */}
      <div className="mt-6 wen-panel-padded text-xs text-ink-400 flex gap-6">
        <span className="flex items-center gap-1">
          <Clock size={12} />
          创建：{formatDate(stats.createdAt)}
        </span>
        <span className="flex items-center gap-1">
          <Clock size={12} />
          更新：{formatDate(stats.updatedAt)}
        </span>
        <span>状态：{stats.status}</span>
      </div>
    </StepPageFrame>
  );
}
