"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { WritingBottomSheet } from "@/components/writing/WritingBottomSheet";
import { WritingFloatChip, WritingFloatSeal } from "@/components/writing/WritingFloatChip";
import {
  FALLBACK_INTENSITY,
  clampStyleIntensity,
  type StyleIntensityRange,
} from "@/lib/writingStyles";

type Profile = { _id: string; name: string };

type Props = {
  open: boolean;
  onClose: () => void;
  scopeLabel: string;
  profiles: Profile[];
  selectedId: string;
  intensityRange?: StyleIntensityRange;
  loading?: boolean;
  onSelect: (id: string) => void;
  onSetProjectDefault: (id: string) => void;
  onApply: (profileId: string, intensity: number) => void;
};

export function CustomStyleSheet({
  open,
  onClose,
  scopeLabel,
  profiles,
  selectedId,
  intensityRange = FALLBACK_INTENSITY,
  loading = false,
  onSelect,
  onSetProjectDefault,
  onApply,
}: Props) {
  const [intensity, setIntensity] = useState(45);
  const [setDefault, setSetDefault] = useState(true);
  const sliderVal = clampStyleIntensity(
    intensity,
    "professional",
    [],
    intensityRange,
  );
  const selected = profiles.find((p) => p._id === selectedId);
  const name = selected?.name ?? "未选择";

  return (
    <WritingBottomSheet
      open={open}
      onClose={onClose}
      title="自定义风格"
      scopeLabel={scopeLabel}
      subtitle="从范文学习的个人风格，保存后每次按档案 + 浓度改写。"
      footer={
        <div className="flex flex-wrap gap-2 justify-end mt-4">
          <WritingFloatChip disabled={loading} onClick={onClose}>
            取消
          </WritingFloatChip>
          <WritingFloatSeal
            disabled={loading || !selectedId}
            onClick={() => {
              if (setDefault && selectedId) onSetProjectDefault(selectedId);
              onApply(selectedId, sliderVal);
            }}
          >
            {loading ? <Loader2 className="animate-spin" size={14} /> : null}
            按「{name}」{sliderVal}% 改写
            {scopeLabel.includes("选中") ? "选中" : "全文"}
          </WritingFloatSeal>
        </div>
      }
    >
      {profiles.length === 0 ? (
        <p className="text-sm text-ink-muted mb-4">
          暂无风格档案。请先在设置中从范文创建，或联系管理员添加。
        </p>
      ) : (
        <div className="flex flex-col gap-2 mb-4">
          {profiles.map((p) => (
            <button
              key={p._id}
              type="button"
              disabled={loading}
              onClick={() => onSelect(p._id)}
              className={clsx(
                "wen-sheet-style-card flex items-start gap-2 text-left w-full",
                p._id === selectedId && "wen-sheet-style-card-selected",
              )}
            >
              <span
                className={clsx(
                  "mt-1.5 w-2 h-2 rounded-full shrink-0 transition-colors",
                  p._id === selectedId ? "bg-primary-700" : "bg-surface-300",
                )}
                aria-hidden
              />
              <span>
                <span className="font-kaiti text-sm text-ink-900 block">
                  {p.name}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center gap-3 text-sm text-ink-muted mb-3">
        <span>浓度</span>
        <input
          type="range"
          min={intensityRange.min}
          max={intensityRange.max}
          value={sliderVal}
          disabled={loading}
          className="flex-1 accent-primary-500"
          onChange={(e) => setIntensity(Number(e.target.value))}
        />
        <strong className="text-ink-800 tabular-nums w-8 text-right">
          {sliderVal}%
        </strong>
      </div>
      <label className="flex items-center gap-2 text-xs text-ink-muted mb-2 cursor-pointer">
        <input
          type="checkbox"
          checked={setDefault}
          disabled={loading || !selectedId}
          onChange={(e) => setSetDefault(e.target.checked)}
        />
        设为项目默认风格（下次自动选中）
      </label>
    </WritingBottomSheet>
  );
}
