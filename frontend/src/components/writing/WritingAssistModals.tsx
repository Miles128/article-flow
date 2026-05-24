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
      <div className="w-full max-w-lg bg-surface-100 border border-surface-300">
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

type GlobalPromptModalProps = {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onApply: (instruction: string) => void;
};

export function GlobalPromptModal({
  open,
  loading,
  onClose,
  onApply,
}: GlobalPromptModalProps) {
  const [instruction, setInstruction] = useState("");

  useEffect(() => {
    if (open) setInstruction("");
  }, [open]);

  if (!open) return null;

  return (
    <ModalShell title="整体提示词改稿" onClose={onClose}>
      <p className="text-xs text-ink-400 mb-3">
        描述你想对整篇文章做的修改，AI 会按你的要求重写全文（保留核心事实）。
      </p>
      <textarea
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        rows={6}
        placeholder="例如：语气改得更口语；删掉重复段落；加强开头吸引力…"
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
          应用修改
        </button>
      </div>
    </ModalShell>
  );
}

type ShortenModalProps = {
  open: boolean;
  loading: boolean;
  content: string;
  onClose: () => void;
  onApply: (targetWordCount: number) => void;
};

export function ShortenModal({
  open,
  loading,
  content,
  onClose,
  onApply,
}: ShortenModalProps) {
  const sourceWords = countArticleWords(content);
  const minWords =
    sourceWords <= 2
      ? 1
      : Math.max(1, Math.min(Math.floor(sourceWords * 0.15), sourceWords - 1));
  const maxWords = Math.max(minWords, sourceWords - 1);
  const [targetWords, setTargetWords] = useState(Math.floor(sourceWords * 0.7));

  useEffect(() => {
    if (open && sourceWords > 1) {
      setTargetWords(
        Math.max(minWords, Math.min(maxWords, Math.floor(sourceWords * 0.7))),
      );
    }
  }, [open, sourceWords, minWords, maxWords]);

  if (!open) return null;

  const ratio =
    sourceWords > 0 ? Math.round((targetWords / sourceWords) * 100) : 0;
  const canApply = sourceWords > 1 && targetWords < sourceWords;

  return (
    <ModalShell title="缩写全文" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex justify-between text-sm">
          <span className="text-ink-500">
            当前字数：
            <strong className="text-ink-900 font-kaiti">{sourceWords}</strong>
          </span>
          <span className="text-ink-500">
            目标字数：
            <strong className="text-primary-600 font-kaiti">
              {targetWords}
            </strong>
            <span className="text-ink-300 ml-1">({ratio}%)</span>
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
        <div className="flex justify-between text-[10px] text-ink-300 font-kaiti">
          <span>{minWords} 字</span>
          <span>{maxWords} 字</span>
        </div>
        <p className="text-xs text-ink-400">
          拖动滑块选择目标字数。AI 会在允许误差内压缩全文，保留关键信息与结构。
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
            开始缩写
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
