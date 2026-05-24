"use client";

import { useCallback, useEffect, useState } from "react";
import { writingApi } from "@/lib/api/client";
import { showToast } from "@/components/ui/Toast";
import { getApiError } from "@/lib/apiError";
import type { AntiAiScanResult } from "@/types";
import {
  AlertCircle,
  Loader2,
  Wand2,
  Scan,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { clsx } from "clsx";

interface LlmIssue {
  text: string;
  type: string;
  suggestion: string;
}

interface AntiAiPanelProps {
  content: string;
  onApplyFix?: (fixed: string) => void;
  styleProfileId?: string;
  /** 面板打开时自动检测全文 */
  active?: boolean;
}

export function AntiAiPanel({
  content,
  onApplyFix,
  styleProfileId,
  active = true,
}: AntiAiPanelProps) {
  const [ruleScan, setRuleScan] = useState<AntiAiScanResult | null>(null);
  const [llmScore, setLlmScore] = useState<number | null>(null);
  const [llmIssues, setLlmIssues] = useState<LlmIssue[]>([]);
  const [llmSuggestions, setLlmSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [humanizing, setHumanizing] = useState(false);
  const [lastFixSummary, setLastFixSummary] = useState<string | null>(null);

  const runAnalysis = useCallback(async () => {
    if (!content.trim()) {
      showToast("error", "请先输入文章内容");
      return;
    }
    setLoading(true);
    setLastFixSummary(null);
    try {
      const resp = await writingApi.analyzeAITaste(content);
      const data = resp.data as {
        score?: number;
        issues?: LlmIssue[];
        suggestions?: string[];
        ruleScan?: AntiAiScanResult;
      };
      setRuleScan(data.ruleScan || null);
      setLlmScore(typeof data.score === "number" ? data.score : null);
      setLlmIssues(
        Array.isArray(data.issues)
          ? data.issues.map((item) => ({
              text: item.text || (item as { original?: string }).original || "",
              type: item.type || "AI味",
              suggestion: item.suggestion || "改写为更口语、更具体的表达",
            }))
          : [],
      );
      setLlmSuggestions(
        Array.isArray(data.suggestions) ? data.suggestions : [],
      );
      if (!data.ruleScan && !data.score) {
        showToast("warning", "检测完成，但未返回有效结果");
      }
    } catch (error: unknown) {
      showToast("error", getApiError(error, "AI 味检测失败"));
      setRuleScan(null);
      setLlmScore(null);
      setLlmIssues([]);
      setLlmSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [content]);

  useEffect(() => {
    if (active && content.trim()) {
      runAnalysis();
    }
    // 仅在面板打开时自动检测，避免每次输入都触发
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  async function handleFix(useLlm: boolean) {
    if (!content.trim()) return;
    setFixing(true);
    setLastFixSummary(null);
    try {
      const resp = await writingApi.fixAiRules(content, {
        useLlmPolish: useLlm,
        styleProfileId,
      });
      const fixed = resp.data.fixedContent;
      const before = resp.data.beforeScore;
      const after = resp.data.afterScore;
      if (fixed === content) {
        showToast("warning", "未发现可自动替换的规则项，可尝试「AI 去味改写」");
      } else {
        onApplyFix?.(fixed);
        showToast("success", `已应用修复，AI味 ${before} → ${after}`);
        setLastFixSummary(`规则修复：${before} → ${after}`);
      }
      await runAnalysis();
    } catch (error: unknown) {
      showToast("error", getApiError(error, "修复失败"));
    } finally {
      setFixing(false);
    }
  }

  async function handleHumanize() {
    if (!content.trim()) return;
    setHumanizing(true);
    setLastFixSummary(null);
    try {
      const resp = await writingApi.humanize({ content });
      const fixed = resp.data.content;
      if (fixed === content) {
        showToast("warning", "改写结果与原文相同");
      } else {
        onApplyFix?.(fixed);
        showToast(
          "success",
          `人味化完成，AI味 ${resp.data.beforeScore} → ${resp.data.afterScore}`,
        );
        setLastFixSummary(
          `人味化：${resp.data.beforeScore} → ${resp.data.afterScore}`,
        );
      }
      await runAnalysis();
    } catch (error: unknown) {
      showToast("error", getApiError(error, "人味化改写失败"));
    } finally {
      setHumanizing(false);
    }
  }

  const scoreColor = (s: number, target: number) =>
    s < target
      ? "text-green-600 bg-green-100"
      : s < target + 20
        ? "text-yellow-600 bg-yellow-100"
        : "text-red-600 bg-red-100";

  const displayScore = ruleScan?.score ?? llmScore;
  const target = ruleScan?.targetScore ?? 30;

  return (
    <div className=" border border-purple-200 bg-purple-50/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="wen-title flex items-center gap-2">
          <Scan size={16} className="text-purple-600" />
          AI 味检测
        </h3>
        <button
          type="button"
          onClick={runAnalysis}
          disabled={loading || !content.trim()}
          className="text-xs text-purple-600 hover:underline disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="inline animate-spin" size={12} />
          ) : (
            "重新检测"
          )}
        </button>
      </div>

      {loading && !ruleScan && (
        <div className="flex items-center gap-2 text-xs text-ink-500 py-6 justify-center">
          <Loader2 className="animate-spin" size={16} />
          正在分析全文 AI 味…
        </div>
      )}

      {!loading && !ruleScan && !llmScore && !content.trim() && (
        <p className="text-xs text-ink-400 text-center py-6">
          输入正文后点击「去AI味」进行检测
        </p>
      )}

      {(ruleScan || llmScore !== null) && (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {displayScore !== null && displayScore !== undefined && (
              <span
                className={clsx(
                  "px-3 py-1 text-sm font-bold",
                  scoreColor(displayScore, target),
                )}
              >
                综合 {displayScore}/100
              </span>
            )}
            {llmScore !== null && ruleScan && llmScore !== ruleScan.score && (
              <span className="text-xs text-ink-500">LLM 评估 {llmScore}</span>
            )}
            {ruleScan && (
              <>
                <span className="text-xs text-ink-500">
                  规则目标 &lt; {target}
                </span>
                {!ruleScan.passed && (
                  <span className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle size={12} /> 需优化
                  </span>
                )}
                <span className="text-xs text-ink-400 ml-auto">
                  {ruleScan.matchCount} 处命中
                </span>
              </>
            )}
          </div>

          {llmSuggestions.length > 0 && (
            <div className="mb-3 bg-surface-100 border border-purple-100 p-3">
              <p className="text-xs font-semibold text-ink-700 mb-1">
                整体建议
              </p>
              <ul className="text-xs text-ink-600 space-y-1">
                {llmSuggestions.map((s, i) => (
                  <li key={i}>• {s}</li>
                ))}
              </ul>
            </div>
          )}

          {llmIssues.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-ink-700 mb-1">
                AI 味片段（LLM 分析）
              </p>
              <ul className="max-h-36 overflow-y-auto space-y-2">
                {llmIssues.map((issue, i) => (
                  <li
                    key={i}
                    className="text-xs bg-surface-100 p-2 border border-purple-100"
                  >
                    <p className="text-red-600 font-medium">「{issue.text}」</p>
                    <p className="text-ink-400 mt-0.5">{issue.type}</p>
                    <p className="text-green-700 mt-1">→ {issue.suggestion}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {ruleScan && ruleScan.matches.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-ink-700 mb-1">
                规则命中（套话 / 书面语）
              </p>
              <ul className="max-h-40 overflow-y-auto space-y-2">
                {ruleScan.matches.slice(0, 20).map((m, i) => (
                  <li
                    key={i}
                    className="text-xs bg-surface-100 p-2 border border-purple-100"
                  >
                    <p className="text-red-500 font-medium">「{m.text}」</p>
                    <p className="text-ink-400">{m.category}</p>
                    {m.suggestion && (
                      <p className="text-green-700 mt-1">→ {m.suggestion}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {ruleScan &&
            ruleScan.matches.length === 0 &&
            llmIssues.length === 0 && (
              <p className="text-xs text-green-700 flex items-center gap-1 mb-3">
                <CheckCircle2 size={14} /> 未检测到明显 AI 味套话
              </p>
            )}

          {lastFixSummary && (
            <p className="text-xs text-green-700 mb-2">{lastFixSummary}</p>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleFix(false)}
                disabled={fixing || humanizing || loading}
                className="flex-1 text-xs py-2 bg-surface-100 border border-purple-200 hover:bg-purple-50 disabled:opacity-50"
              >
                {fixing ? (
                  <Loader2 className="inline animate-spin" size={12} />
                ) : (
                  "规则修复"
                )}
              </button>
              <button
                type="button"
                onClick={() => handleFix(true)}
                disabled={fixing || humanizing || loading}
                className="flex-1 text-xs py-2 bg-purple-600 text-white hover:bg-purple-700 flex items-center justify-center gap-1 disabled:opacity-50"
              >
                {fixing ? (
                  <Loader2 className="animate-spin" size={12} />
                ) : (
                  <Wand2 size={12} />
                )}
                AI 润色去味
              </button>
            </div>
            <button
              type="button"
              onClick={handleHumanize}
              disabled={fixing || humanizing || loading}
              className="w-full text-xs py-2 bg-accent-600 text-white hover:bg-accent-700 flex items-center justify-center gap-1 disabled:opacity-50"
            >
              {humanizing ? (
                <Loader2 className="animate-spin" size={12} />
              ) : (
                <Sparkles size={12} />
              )}
              人味化改写（全文）
            </button>
          </div>
        </>
      )}
    </div>
  );
}
