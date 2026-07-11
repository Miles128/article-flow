"use client";

import { Loader2 } from "lucide-react";
import { clsx } from "clsx";

type Props = {
  score: number | null;
  targetScore: number;
  loading?: boolean;
  onClick?: () => void;
};

function scoreTone(score: number, target: number): string {
  if (score <= target) return "wen-ai-score-good";
  if (score <= target + 20) return "wen-ai-score-warn";
  return "wen-ai-score-high";
}

export function WritingAiScoreBadge({
  score,
  targetScore,
  loading = false,
  onClick,
}: Props) {
  const label =
    score != null ? `AI ${score}` : loading ? "AI …" : "AI —";

  return (
    <button
      type="button"
      title={
        score != null
          ? `AI 味评分 ${score}/100，目标 ≤${targetScore}（越低越自然）`
          : "正在检测 AI 味…"
      }
      disabled={loading && score == null}
      onClick={onClick}
      className={clsx(
        "wen-ai-score-badge",
        score != null && scoreTone(score, targetScore),
        onClick && "cursor-pointer",
      )}
    >
      {loading ? (
        <Loader2 className="animate-spin shrink-0" size={12} aria-hidden />
      ) : null}
      <span>{label}</span>
    </button>
  );
}
