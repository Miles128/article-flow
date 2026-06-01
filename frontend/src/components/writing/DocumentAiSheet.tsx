"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { WritingBottomSheet } from "@/components/writing/WritingBottomSheet";
import { WritingFloatChip, WritingFloatSeal } from "@/components/writing/WritingFloatChip";
import { WritingIntentPanel } from "@/components/writing/WritingIntentPanel";
import type { WritingIntentId, WritingIntentOption } from "@/lib/writingIntent";

export type DocumentExprAction = "polish" | "expand" | "shorten" | "antiAi";

type Props = {
  open: boolean;
  onClose: () => void;
  scopeLabel?: string;
  busy?: boolean;
  onRun: (action: DocumentExprAction, extraInstruction?: string) => void;
  intents?: WritingIntentOption[];
  writingIntent?: WritingIntentId;
  finishCoherence?: boolean;
  insightPass?: boolean;
  briefLoading?: boolean;
  onIntentChange?: (id: WritingIntentId) => void;
  onFinishCoherenceChange?: (v: boolean) => void;
  onInsightPassChange?: (v: boolean) => void;
  onGenerateBrief?: () => void;
};

const EXPR_ACTIONS: { id: DocumentExprAction; label: string }[] = [
  { id: "polish", label: "润色" },
  { id: "expand", label: "扩写" },
  { id: "shorten", label: "缩写" },
  { id: "antiAi", label: "去 AI 味" },
];

export function DocumentAiSheet({
  open,
  onClose,
  scopeLabel,
  busy = false,
  onRun,
  intents,
  writingIntent,
  finishCoherence = true,
  insightPass = false,
  briefLoading = false,
  onIntentChange,
  onFinishCoherenceChange,
  onInsightPassChange,
  onGenerateBrief,
}: Props) {
  const showIntent =
    intents &&
    intents.length > 0 &&
    writingIntent &&
    onIntentChange &&
    onFinishCoherenceChange &&
    onInsightPassChange &&
    onGenerateBrief;
  const [expr, setExpr] = useState<DocumentExprAction>("polish");
  const [extra, setExtra] = useState("");
  const scopeShort = scopeLabel?.includes("选中") ? "选中" : "全文";

  const runLabel = extra.trim()
    ? `按描述改写${scopeShort}`
    : `${EXPR_ACTIONS.find((a) => a.id === expr)?.label ?? ""}${scopeShort}`;

  return (
    <WritingBottomSheet
      open={open}
      onClose={onClose}
      title="改表达"
      scopeLabel={scopeLabel}
      subtitle="写作意图与按纲成稿选项在此；润色只改写法。换文风请用「改风格」。"
      footer={
        <div className="flex flex-wrap gap-2 justify-end mt-4">
          <WritingFloatChip disabled={busy} onClick={onClose}>
            取消
          </WritingFloatChip>
          <WritingFloatSeal
            disabled={busy}
            onClick={() => onRun(expr, extra.trim() || undefined)}
          >
            {busy ? <Loader2 className="animate-spin" size={14} /> : null}
            {runLabel}
          </WritingFloatSeal>
        </div>
      }
    >
      {showIntent ? (
        <section className="border-b border-surface-200 pb-3 mb-3">
          <WritingIntentPanel
            embedded
            intents={intents}
            intent={writingIntent}
            finishCoherence={finishCoherence}
            insightPass={insightPass}
            briefLoading={briefLoading}
            onIntentChange={onIntentChange}
            onFinishCoherenceChange={onFinishCoherenceChange}
            onInsightPassChange={onInsightPassChange}
            onGenerateBrief={onGenerateBrief}
          />
        </section>
      ) : null}
      <div className="flex flex-wrap gap-2 mb-4">
        {EXPR_ACTIONS.map((a) => (
          <WritingFloatChip
            key={a.id}
            active={expr === a.id}
            disabled={busy}
            onClick={() => setExpr(a.id)}
          >
            {a.label}
          </WritingFloatChip>
        ))}
      </div>
      <textarea
        className="wen-underline-input"
        rows={2}
        value={extra}
        disabled={busy}
        placeholder="补充要求（选填，临时指令）…"
        onChange={(e) => setExtra(e.target.value)}
      />
      <p className="text-[0.65rem] text-ink-400 mt-1">
        留空则执行上方所选；填写则按一次性指令改写。
      </p>
    </WritingBottomSheet>
  );
}
