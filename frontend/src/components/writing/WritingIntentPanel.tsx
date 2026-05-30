"use client";

import { Loader2 } from "lucide-react";
import { clsx } from "clsx";
import type { WritingIntentId, WritingIntentOption } from "@/lib/writingIntent";

type Props = {
  intents: WritingIntentOption[];
  intent: WritingIntentId;
  finishCoherence: boolean;
  insightPass: boolean;
  briefLoading?: boolean;
  onIntentChange: (id: WritingIntentId) => void;
  onFinishCoherenceChange: (v: boolean) => void;
  onInsightPassChange: (v: boolean) => void;
  onGenerateBrief: () => void;
  className?: string;
  /** 底部抽屉内嵌：更紧凑、少占纵向空间 */
  embedded?: boolean;
};

export function WritingIntentPanel({
  intents,
  intent,
  finishCoherence,
  insightPass,
  briefLoading = false,
  onIntentChange,
  onFinishCoherenceChange,
  onInsightPassChange,
  onGenerateBrief,
  className,
  embedded = false,
}: Props) {
  return (
    <div className={clsx(embedded ? "space-y-2" : "space-y-3", className)}>
      <div>
        <span
          className={clsx(
            "text-xs text-ink-500 font-ui",
            embedded ? "inline mr-2 mb-0" : "block mb-1.5",
          )}
        >
          写作意图
        </span>
        <div
          className={clsx(
            "wen-segment-group flex-wrap",
            embedded && "inline-flex align-middle",
          )}
          role="group"
          aria-label="写作意图"
        >
          {intents.map((t) => (
            <button
              key={t.id}
              type="button"
              title={t.description}
              onClick={() => onIntentChange(t.id)}
              className={clsx(
                "wen-segment-btn text-xs",
                intent === t.id && "wen-segment-btn-active",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        {!embedded ? (
          <p className="text-[11px] text-ink-400 mt-1.5">
            观点评论：强化论断与判断；信息科普：覆盖要点；叙事随笔：保留适度修辞。
          </p>
        ) : null}
      </div>
      <div
        className={clsx(
          "flex flex-wrap items-center gap-2 text-xs text-ink-600",
          embedded && "gap-x-3 gap-y-1.5",
        )}
      >
        <label className="inline-flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={finishCoherence}
            onChange={(e) => onFinishCoherenceChange(e.target.checked)}
          />
          成稿后衔接润色
        </label>
        <label className="inline-flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={insightPass}
            onChange={(e) => onInsightPassChange(e.target.checked)}
            disabled={intent !== "insight_commentary"}
          />
          洞察加强（需写前 Brief）
        </label>
        <button
          type="button"
          className="wen-btn text-xs"
          disabled={briefLoading}
          onClick={onGenerateBrief}
        >
          {briefLoading ? (
            <Loader2 className="animate-spin inline mr-1" size={12} />
          ) : null}
          生成写前 Brief
        </button>
      </div>
    </div>
  );
}
