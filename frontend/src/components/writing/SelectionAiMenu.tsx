"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { WritingFloatChip } from "@/components/writing/WritingFloatChip";
import { countArticleWords } from "@/lib/textUtils";

type Anchor = { x: number; y: number };

type Props = {
  visible: boolean;
  selectionText: string;
  anchor: Anchor | null;
  busy?: boolean;
  onClose: () => void;
  onPolish: () => void;
  onExpand: () => void;
  onShorten: () => void;
  onAntiAi: () => void;
  onStyleRewrite: () => void;
  onPrepareAction?: () => void;
};

export function SelectionAiMenu({
  visible,
  selectionText,
  anchor,
  busy = false,
  onClose,
  onPolish,
  onExpand,
  onShorten,
  onAntiAi,
  onStyleRewrite,
  onPrepareAction,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  const bindAction = (fn: () => void) => ({
    onMouseDown: (e: React.MouseEvent) => {
      e.preventDefault();
      onPrepareAction?.();
    },
    onClick: () => {
      fn();
      onClose();
    },
  });

  useEffect(() => {
    if (!visible) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [visible, onClose]);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!visible || !anchor || !el) return;
    const pad = 8;
    const rect = el.getBoundingClientRect();
    let left = anchor.x + pad;
    let top = anchor.y + pad;
    if (left + rect.width > window.innerWidth - pad) {
      left = anchor.x - rect.width - pad;
    }
    if (top + rect.height > window.innerHeight - pad) {
      top = anchor.y - rect.height - pad;
    }
    el.style.left = `${Math.max(pad, left)}px`;
    el.style.top = `${Math.max(pad, top)}px`;
  }, [visible, anchor, selectionText]);

  if (!visible || !selectionText.trim() || !anchor) return null;

  const words = countArticleWords(selectionText);

  return createPortal(
    <div
      ref={rootRef}
      className="flex flex-col items-start gap-1.5 pointer-events-none"
      style={{ position: "fixed", top: anchor.y, left: anchor.x, zIndex: 80 }}
      role="menu"
      aria-label="选区 AI 操作"
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="text-[9px] tracking-widest text-ink-400 pl-1 pointer-events-none">
        已选中 {words} 字
      </span>
      <div className="flex flex-wrap gap-2 pointer-events-auto max-w-[min(22rem,calc(100vw-1.5rem))]">
        <WritingFloatChip disabled={busy} {...bindAction(onPolish)}>
          润色
        </WritingFloatChip>
        <WritingFloatChip disabled={busy} {...bindAction(onExpand)}>
          扩写
        </WritingFloatChip>
        <WritingFloatChip disabled={busy} {...bindAction(onShorten)}>
          缩写
        </WritingFloatChip>
        <WritingFloatChip disabled={busy} {...bindAction(onAntiAi)}>
          去 AI 味
        </WritingFloatChip>
        <WritingFloatChip
          disabled={busy}
          variant="seal"
          {...bindAction(onStyleRewrite)}
        >
          改风格
        </WritingFloatChip>
      </div>
    </div>,
    document.body,
  );
}
