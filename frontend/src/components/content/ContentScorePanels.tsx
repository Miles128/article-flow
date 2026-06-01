"use client";

import { clsx } from "clsx";
import type { ContentEvalResult, CriticResult } from "@/types";

export type { ContentEvalResult, CriticResult };

const EVAL_DIM_LABELS: Record<string, string> = {
  title: "标题",
  opening: "开头",
  body: "正文",
  language: "语言",
  ai_flavor: "AI味",
  closing: "结尾",
};

const CRITIC_DIM_LABELS: Record<string, string> = {
  accuracy: "内容准确性",
  structure: "结构完整性",
  platform_fit: "平台适配度",
  readability: "可读性",
  density: "信息密度",
};

function scoreColor(score: number, max: number) {
  const pct = score / max;
  if (pct >= 0.75) return "text-green-600 bg-green-100";
  if (pct >= 0.5) return "text-yellow-600 bg-yellow-100";
  return "text-red-600 bg-red-100";
}

export function ContentEvalCard({
  evalResult,
}: {
  evalResult: ContentEvalResult;
}) {
  const dimMax: Record<string, number> = {
    title: 15,
    opening: 15,
    body: 25,
    language: 15,
    ai_flavor: 30,
    closing: 10,
  };

  return (
    <div className="wen-panel-padded border border-blue-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="wen-title text-ink-900">内容量表评估</h3>
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              "text-2xl font-bold",
              evalResult.passed ? "text-green-600" : "text-red-600",
            )}
          >
            {evalResult.totalScore}/100
          </span>
          <span
            className={clsx(
              "text-xs px-2 py-0.5 rounded",
              evalResult.passed
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700",
            )}
          >
            {evalResult.passed ? "达标" : "未达标"}
          </span>
        </div>
      </div>

      <p className="text-sm text-ink-600 mb-3">
        AI味 {evalResult.aiFlavorScore}/100 · {evalResult.aiFlavorBand}
        {evalResult.rewriteRequired && (
          <span className="ml-2 text-red-600">建议重写</span>
        )}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
        {Object.entries(evalResult.dimensions).map(([key, val]) => {
          const max = dimMax[key] || 10;
          return (
            <div key={key} className="p-2 bg-surface-200/30 ">
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink-600">
                  {EVAL_DIM_LABELS[key] || key}
                </span>
                <span
                  className={clsx(
                    "text-xs font-bold px-1.5 py-0.5 rounded",
                    scoreColor(val, max),
                  )}
                >
                  {val}/{max}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {evalResult.suggestions.length > 0 && (
        <ul className="text-xs text-ink-600 space-y-1">
          {evalResult.suggestions.map((s, i) => (
            <li key={i}>• {s}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CriticCard({ critic }: { critic: CriticResult }) {
  return (
    <div className="wen-panel-padded border border-indigo-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="wen-title text-ink-900">Critic 五维评审</h3>
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              "text-2xl font-bold",
              critic.passed ? "text-green-600" : "text-yellow-600",
            )}
          >
            {critic.score}/10
          </span>
          <span
            className={clsx(
              "text-xs px-2 py-0.5 rounded",
              critic.passed
                ? "bg-green-100 text-green-700"
                : "bg-yellow-100 text-yellow-700",
            )}
          >
            {critic.passed ? "通过" : "待改进"}
          </span>
        </div>
      </div>

      {critic.feedback && (
        <p className="text-sm text-ink-700 mb-4">{critic.feedback}</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {Object.entries(critic.breakdown || {}).map(([key, val]) => (
          <div key={key} className="p-2 bg-indigo-50 ">
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink-600">
                {CRITIC_DIM_LABELS[key] || key}
              </span>
              <span
                className={clsx(
                  "text-xs font-bold px-1.5 py-0.5 rounded",
                  scoreColor(val, 2),
                )}
              >
                {val}/2
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
