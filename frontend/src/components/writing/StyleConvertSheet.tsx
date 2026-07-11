"use client";

import { Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { WritingBottomSheet } from "@/components/writing/WritingBottomSheet";
import { WritingFloatChip, WritingFloatSeal } from "@/components/writing/WritingFloatChip";
import {
  clampStyleIntensity,
  type StyleIntensityRange,
  type WritingStyleOption,
  writingTargetStyleLabel,
} from "@/lib/writingStyles";

type Props = {
  open: boolean;
  onClose: () => void;
  scopeLabel: string;
  styles: WritingStyleOption[];
  styleId: string;
  intensity: number;
  intensityRange: StyleIntensityRange;
  loading?: boolean;
  restoreDisabled?: boolean;
  onStyleChange: (id: string) => void;
  onIntensityChange: (pct: number) => void;
  onRestorePlain: () => void;
  onApply: () => void;
};

export function StyleConvertSheet({
  open,
  onClose,
  scopeLabel,
  styles,
  styleId,
  intensity,
  intensityRange,
  loading = false,
  restoreDisabled = false,
  onStyleChange,
  onIntensityChange,
  onRestorePlain,
  onApply,
}: Props) {
  const meta = styles.find((s) => s.id === styleId);
  const sliderMax = Math.min(
    intensityRange.max,
    meta?.maxIntensity ?? intensityRange.max,
  );
  const sliderVal = clampStyleIntensity(
    intensity,
    styleId,
    styles,
    intensityRange,
  );
  const label = writingTargetStyleLabel(styleId, styles);
  const span = intensityRange.max - intensityRange.min;
  const fillPct =
    span > 0 ? ((sliderVal - intensityRange.min) / span) * 100 : 0;
  const capPct = span > 0 ? ((sliderMax - intensityRange.min) / span) * 100 : 100;

  return (
    <WritingBottomSheet
      open={open}
      onClose={onClose}
      title="风格转换"
      scopeLabel={scopeLabel}
      subtitle="选择内置文体与浓度，一次完成改写。"
      footer={
        <div className="flex flex-wrap gap-2 justify-end mt-4">
          <WritingFloatChip disabled={loading} onClick={onClose}>
            取消
          </WritingFloatChip>
          <WritingFloatChip
            disabled={loading || restoreDisabled}
            onClick={onRestorePlain}
          >
            恢复转换前
          </WritingFloatChip>
          <WritingFloatSeal disabled={loading} onClick={onApply}>
            {loading ? <Loader2 className="animate-spin" size={14} /> : null}
            按「{label}」{sliderVal}% 改写{scopeLabel.includes("选中") ? "选中" : "全文"}
          </WritingFloatSeal>
        </div>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
        {styles.map((s) => (
          <button
            key={s.id}
            type="button"
            disabled={loading}
            title={s.description}
            onClick={() => onStyleChange(s.id)}
            className={clsx(
              "wen-sheet-style-card",
              s.id === styleId && "wen-sheet-style-card-selected",
            )}
          >
            <span className="font-kaiti text-sm text-ink-900 block">{s.label}</span>
            {s.description ? (
              <span className="text-[0.62rem] text-ink-faint leading-snug block mt-0.5">
                {s.description}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3 text-sm text-ink-muted mb-2">
        <span>浓度</span>
        <input
          type="range"
          min={intensityRange.min}
          max={intensityRange.max}
          step={1}
          value={sliderVal}
          disabled={loading}
          style={{
            flex: 1,
            accentColor: "var(--seal, #b84a32)",
            background: `linear-gradient(to right, var(--seal, #b84a32) 0%, var(--seal, #b84a32) ${fillPct}%, var(--paper-line, #d9c9a8) ${fillPct}%, var(--paper-line, #d9c9a8) ${capPct}%, #e8e2d6 ${capPct}%)`,
          }}
          onChange={(e) =>
            onIntensityChange(
              clampStyleIntensity(
                Number(e.target.value),
                styleId,
                styles,
                intensityRange,
              ),
            )
          }
        />
        <strong className="text-ink-800 tabular-nums w-8 text-right">
          {sliderVal}%
        </strong>
      </div>
    </WritingBottomSheet>
  );
}
