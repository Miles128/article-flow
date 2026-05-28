"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { countArticleWords } from "@/lib/textUtils";

type ModalShellProps = {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

function ModalShell({ title, onClose, children }: ModalShellProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/15 p-4">
      <div className="w-full max-w-lg bg-surface-50/70 backdrop-blur-[3px] border border-surface-300">
        <div className="flex items-center justify-between border-b border-surface-300 px-4 py-3">
          <h3 className="wen-title">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-ink-400 hover:text-ink-800"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

type WordTargetModalProps = {
  open: boolean;
  loading: boolean;
  content: string;
  mode: "shorten" | "expand";
  onClose: () => void;
  onApply: (targetWordCount: number) => void;
};

function WordTargetModal({
  open,
  loading,
  content,
  mode,
  onClose,
  onApply,
}: WordTargetModalProps) {
  const sourceWords = countArticleWords(content);
  const isExpand = mode === "expand";

  const minWords = isExpand
    ? sourceWords <= 1
      ? 2
      : sourceWords + 1
    : sourceWords <= 2
      ? 1
      : Math.max(1, Math.min(Math.floor(sourceWords * 0.15), sourceWords - 1));

  const maxWords = isExpand
    ? Math.max(minWords, Math.min(sourceWords * 3, sourceWords + 3000))
    : Math.max(minWords, sourceWords - 1);

  const defaultTarget = isExpand
    ? Math.max(minWords, Math.min(maxWords, Math.ceil(sourceWords * 1.5)))
    : Math.max(minWords, Math.min(maxWords, Math.floor(sourceWords * 0.7)));

  const [targetWords, setTargetWords] = useState(defaultTarget);

  useEffect(() => {
    if (open && sourceWords > 0) {
      setTargetWords(defaultTarget);
    }
  }, [open, sourceWords, defaultTarget]);

  if (!open) return null;

  const ratio =
    sourceWords > 0 ? Math.round((targetWords / sourceWords) * 100) : 0;
  const canApply = isExpand
    ? sourceWords > 0 && targetWords > sourceWords
    : sourceWords > 1 && targetWords < sourceWords;

  const title = isExpand ? "扩写" : "缩写";
  return (
    <ModalShell title={title} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs text-ink-400">
          将按当前选中片段处理；未选中则为全文。
        </p>
        <div className="flex justify-between text-sm">
          <span className="text-ink-500">
            当前字数：
            <strong className="text-ink-900 font-kaiti tabular-nums">
              {sourceWords}
            </strong>
          </span>
          <span className="text-ink-500">
            目标字数：
            <strong className="text-primary-600 font-kaiti tabular-nums">
              {targetWords}
            </strong>
            <span className="text-ink-300 ml-1 tabular-nums">({ratio}%)</span>
          </span>
        </div>
        <input
          type="range"
          min={minWords}
          max={maxWords}
          step={1}
          value={targetWords}
          onChange={(e) => setTargetWords(Number(e.target.value))}
          className="w-full h-px accent-primary-500 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-ink-300 font-kaiti tabular-nums">
          <span>{minWords} 字</span>
          <span>{maxWords} 字</span>
        </div>
        <p className="text-xs text-ink-400">
          {isExpand
            ? "拖动滑块设定目标字数，AI 会在保持原意的前提下补充细节与例子。"
            : "拖动滑块选择目标字数。AI 会在允许误差内压缩内容，保留关键信息与结构。"}
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="wen-btn"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => onApply(targetWords)}
            disabled={loading || !canApply}
            className="wen-btn-seal"
          >
            {loading ? <Loader2 className="animate-spin" size={12} /> : null}
            {isExpand ? "开始扩写" : "开始缩写"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

export function ShortenModal(
  props: Omit<WordTargetModalProps, "mode">,
) {
  return <WordTargetModal {...props} mode="shorten" />;
}

export function ExpandModal(props: Omit<WordTargetModalProps, "mode">) {
  return <WordTargetModal {...props} mode="expand" />;
}

import { WRITING_TARGET_STYLES } from "@/lib/writingStyles";

export { WRITING_TARGET_STYLES };

const STYLE_DESCRIPTIONS: Record<string, string> = {
  professional: "商务、报告、专业文章",
  casual: "博客、社交媒体",
  conversational: "像和朋友聊天",
  academic: "论文、研究报告",
  poetic: "散文、文学表达",
  humorous: "轻松活泼、有梗",
};

type StyleConvertModalProps = {
  open: boolean;
  loading: boolean;
  hasSelection?: boolean;
  initialStyleId: string;
  onClose: () => void;
  onApply: (styleId: string) => void;
};

export function StyleConvertModal({
  open,
  loading,
  hasSelection = false,
  initialStyleId,
  onClose,
  onApply,
}: StyleConvertModalProps) {
  const [styleId, setStyleId] = useState(initialStyleId);

  useEffect(() => {
    if (open) setStyleId(initialStyleId);
  }, [open, initialStyleId]);

  if (!open) return null;

  const selected = WRITING_TARGET_STYLES.find((s) => s.id === styleId);

  return (
    <ModalShell title="风格转换" onClose={onClose}>
      <p className="text-xs text-ink-500 mb-3">
        {hasSelection
          ? "将选中片段改写为下方所选风格（不改变未选中部分）。"
          : "将全文改写为下方所选风格。"}
        <span className="block mt-1 text-ink-400">
          与「润色」不同：润色只优化表达，不切换文体。
        </span>
      </p>
      <p className="text-xs text-ink-600 mb-2 font-medium">目标风格</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto">
        {WRITING_TARGET_STYLES.map((style) => (
          <button
            key={style.id}
            type="button"
            onClick={() => setStyleId(style.id)}
            className={`text-left px-3 py-2 border text-xs transition-colors ${
              styleId === style.id
                ? "border-primary-400 bg-primary-50/80 text-primary-800"
                : "border-surface-300 hover:border-ink-300"
            }`}
          >
            <p className="font-medium">{style.label}</p>
            <p className="text-[10px] text-ink-400 mt-0.5">
              {STYLE_DESCRIPTIONS[style.id] ?? ""}
            </p>
          </button>
        ))}
      </div>
      {selected ? (
        <p className="text-xs text-ink-400 mt-3">
          将转换为：<span className="text-ink-700">{selected.label}</span>
        </p>
      ) : null}
      <div className="flex justify-end gap-2 mt-4 pt-1">
        <button type="button" onClick={onClose} disabled={loading} className="wen-btn">
          取消
        </button>
        <button
          type="button"
          onClick={() => onApply(styleId)}
          disabled={loading}
          className="wen-btn-seal"
        >
          {loading ? <Loader2 className="animate-spin" size={12} /> : null}
          开始转换
        </button>
      </div>
    </ModalShell>
  );
}

type GlobalPromptModalProps = {
  open: boolean;
  loading: boolean;
  hasSelection?: boolean;
  onClose: () => void;
  onApply: (instruction: string) => void;
};

export function GlobalPromptModal({
  open,
  loading,
  hasSelection = false,
  onClose,
  onApply,
}: GlobalPromptModalProps) {
  const [instruction, setInstruction] = useState("");

  useEffect(() => {
    if (open) setInstruction("");
  }, [open]);

  if (!open) return null;

  return (
    <ModalShell title="智能改写" onClose={onClose}>
      <p className="text-xs text-ink-400 mb-3">
        {hasSelection
          ? "描述你想对选中片段做的修改，AI 只改写选中部分。"
          : "描述你想对全文做的修改，AI 会按你的要求重写（保留核心事实）。"}
      </p>
      <textarea
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        rows={6}
        placeholder="例如：语气改得更口语；删掉重复；加强数据与例子…"
        className="wen-input resize-none font-kaiti text-sm leading-relaxed"
      />
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="wen-btn"
        >
          取消
        </button>
        <button
          type="button"
          onClick={() => onApply(instruction.trim())}
          disabled={loading || !instruction.trim()}
          className="wen-btn-seal"
        >
          {loading ? <Loader2 className="animate-spin" size={12} /> : null}
          应用改写
        </button>
      </div>
    </ModalShell>
  );
}
