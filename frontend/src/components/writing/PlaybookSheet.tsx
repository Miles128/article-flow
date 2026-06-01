"use client";

import { WritingBottomSheet } from "@/components/writing/WritingBottomSheet";
import { PlaybookPanel } from "@/components/writing/PlaybookPanel";

type Props = {
  open: boolean;
  onClose: () => void;
  refreshKey: number;
};

export function PlaybookSheet({ open, onClose, refreshKey }: Props) {
  return (
    <WritingBottomSheet
      open={open}
      onClose={onClose}
      title="Playbook"
      subtitle="写作检查清单与改进建议。"
    >
      <PlaybookPanel refreshKey={refreshKey} />
    </WritingBottomSheet>
  );
}
