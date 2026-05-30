"use client";

import { WritingBottomSheet } from "@/components/writing/WritingBottomSheet";
import { AntiAiPanel } from "@/components/writing/AntiAiPanel";

type Props = {
  open: boolean;
  onClose: () => void;
  scopeLabel: string;
  content: string;
  selectionText?: string;
  styleProfileId?: string;
  onApplyFix: (fixed: string) => void;
};

export function AntiAiSheet({
  open,
  onClose,
  scopeLabel,
  content,
  selectionText,
  styleProfileId,
  onApplyFix,
}: Props) {
  return (
    <WritingBottomSheet
      open={open}
      onClose={onClose}
      title="去 AI 味"
      scopeLabel={scopeLabel}
      subtitle="扫描 AI 痕迹并一键改写，保留原意。"
    >
      <AntiAiPanel
        content={content}
        selectionText={selectionText}
        onApplyFix={onApplyFix}
        styleProfileId={styleProfileId}
        active={open}
      />
    </WritingBottomSheet>
  );
}
