"use client";

import type { ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  scopeLabel?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function WritingBottomSheet({
  open,
  onClose,
  title,
  subtitle,
  scopeLabel,
  children,
  footer,
}: Props) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="wen-sheet-backdrop"
        aria-label="关闭"
        onClick={onClose}
      />
      <div className="wen-bottom-sheet" role="dialog" aria-modal="true">
        <div className="wen-sheet-handle" aria-hidden />
        <h2 className="wen-title text-ink-900 text-base mb-1">
          {title}
          {scopeLabel ? (
            <span className="wen-scope-pill">{scopeLabel}</span>
          ) : null}
        </h2>
        {subtitle ? (
          <p className="text-xs text-ink-muted mb-4 leading-relaxed">{subtitle}</p>
        ) : null}
        {children}
        {footer}
      </div>
    </>
  );
}
