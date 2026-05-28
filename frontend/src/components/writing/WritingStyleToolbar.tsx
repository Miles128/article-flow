"use client";

import { Loader2, Wand2 } from "lucide-react";
import { clsx } from "clsx";
import {
  clampStyleIntensity,
  type StyleIntensityRange,
  type WritingStyleOption,
} from "@/lib/writingStyles";

type Props = {
  value: string;
  intensity: number;
  styles: WritingStyleOption[];
  defaultStyle: string;
  intensityRange: StyleIntensityRange;
  onChange: (id: string) => void;
  onIntensityChange: (pct: number) => void;
  onConvert?: () => void;
  convertDisabled?: boolean;
  convertLoading?: boolean;
  showConvertButton?: boolean;
  className?: string;
};

export function WritingStyleToolbar({
  value,
  intensity,
  styles,
  defaultStyle,
  intensityRange,
  onChange,
  onIntensityChange,
  onConvert,
  convertDisabled = false,
  convertLoading = false,
  showConvertButton = true,
  className,
}: Props) {
  const effective = styles.some((s) => s.id === value) ? value : defaultStyle;
  const meta = styles.find((s) => s.id === effective);
  const sliderMax = Math.min(
    intensityRange.max,
    meta?.maxIntensity ?? intensityRange.max,
  );
  const sliderVal = clampStyleIntensity(
    intensity,
    effective,
    styles,
    intensityRange,
  );

  return (
    <div
      className={clsx(
        "flex items-center gap-1.5 shrink-0 border border-surface-300 bg-surface-50/80 px-1.5 py-0.5",
        className,
      )}
    >
      <label className="flex items-center gap-1 text-xs text-ink-500 shrink-0">
        <span className="text-ink-400 whitespace-nowrap">风格</span>
        <select
          value={effective}
          onChange={(e) => onChange(e.target.value)}
          disabled={convertLoading}
          className="border-0 bg-transparent text-ink-800 text-xs font-medium py-0.5 pr-5 pl-0 cursor-pointer focus:outline-none max-w-[5.5rem]"
          title="文体类型"
        >
          {styles.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <label
        className="flex items-center gap-1 text-xs text-ink-500 shrink-0 border-l border-surface-300 pl-1.5"
        title="风格浓度：数值越低越克制，幽默等文体有单独上限"
      >
        <span className="text-ink-400 whitespace-nowrap">浓度</span>
        <input
          type="range"
          min={intensityRange.min}
          max={sliderMax}
          step={1}
          value={sliderVal}
          disabled={convertLoading}
          onChange={(e) =>
            onIntensityChange(
              clampStyleIntensity(
                Number(e.target.value),
                effective,
                styles,
                intensityRange,
              ),
            )
          }
          className="w-14 h-1 accent-primary-500 cursor-pointer"
        />
        <span className="text-ink-700 font-medium tabular-nums w-7 text-right">
          {sliderVal}%
        </span>
      </label>
      {showConvertButton && onConvert ? (
        <button
          type="button"
          onClick={onConvert}
          disabled={convertDisabled || convertLoading}
          title="将全文或选中段落改写为所选风格与浓度"
          className="wen-btn shrink-0 border-l border-surface-300 pl-1.5 ml-0.5 disabled:opacity-50"
        >
          {convertLoading ? (
            <Loader2 className="animate-spin" size={12} />
          ) : (
            <Wand2 size={12} className="text-accent-500" />
          )}
          风格转换
        </button>
      ) : null}
    </div>
  );
}
