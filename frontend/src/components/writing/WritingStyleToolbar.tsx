"use client";

import { Loader2, Wand2 } from "lucide-react";
import { clsx } from "clsx";
import {
  clampStyleIntensity,
  type StyleIntensityRange,
  type WritingStyleOption,
} from "@/lib/writingStyles";

/** 常用风格以胶囊展示，其余收入「更多」下拉 */
const PILL_STYLE_COUNT = 5;

type Props = {
  value: string;
  intensity: number;
  styles: WritingStyleOption[];
  defaultStyle: string;
  intensityRange: StyleIntensityRange;
  onChange: (id: string) => void;
  onIntensityChange: (pct: number) => void;
  onConvert?: () => void;
  onRestorePlain?: () => void;
  convertDisabled?: boolean;
  convertLoading?: boolean;
  restorePlainDisabled?: boolean;
  showConvertButton?: boolean;
  className?: string;
};

function intensityTrackBackground(
  value: number,
  min: number,
  max: number,
  cap: number,
): string {
  const span = max - min;
  if (span <= 0) return "var(--paper-line)";
  const fillPct = ((value - min) / span) * 100;
  const capPct = ((cap - min) / span) * 100;
  return `linear-gradient(to right, var(--seal) 0%, var(--seal) ${fillPct}%, var(--paper-line) ${fillPct}%, var(--paper-line) ${capPct}%, #e8e2d6 ${capPct}%, #e8e2d6 100%)`;
}

export function WritingStyleToolbar({
  value,
  intensity,
  styles,
  defaultStyle,
  intensityRange,
  onChange,
  onIntensityChange,
  onConvert,
  onRestorePlain,
  convertDisabled = false,
  convertLoading = false,
  restorePlainDisabled = false,
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

  const pillStyles = styles.slice(0, PILL_STYLE_COUNT);
  const overflowStyles = styles.slice(PILL_STYLE_COUNT);
  const effectiveInOverflow = overflowStyles.some((s) => s.id === effective);

  const rangeMin = intensityRange.min;
  const rangeMax = intensityRange.max;

  return (
    <div
      className={clsx(
        "flex flex-wrap items-center gap-1.5 shrink-0 border border-surface-300 bg-surface-50/80 px-1.5 py-0.5",
        className,
      )}
    >
      <div
        className="flex items-center gap-1 shrink-0"
        role="group"
        aria-label="文体风格"
      >
        <span className="text-xs text-ink-400 whitespace-nowrap">风格</span>
        <div className="flex items-center gap-0.5">
          {pillStyles.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={convertLoading}
              onClick={() => onChange(s.id)}
              title={s.description ?? s.label}
              aria-pressed={s.id === effective}
              className={clsx(
                "px-1.5 py-0.5 text-xs rounded transition-colors disabled:opacity-50",
                s.id === effective
                  ? "wen-chip-active"
                  : "bg-surface-200/50 text-ink-600 hover:bg-gray-200",
              )}
            >
              {s.label}
            </button>
          ))}
          {overflowStyles.length > 0 ? (
            <label className="sr-only" htmlFor="writing-style-overflow">
              更多文体
            </label>
          ) : null}
          {overflowStyles.length > 0 ? (
            <select
              id="writing-style-overflow"
              value={effectiveInOverflow ? effective : ""}
              disabled={convertLoading}
              onChange={(e) => onChange(e.target.value)}
              title={
                effectiveInOverflow && meta?.description
                  ? meta.description
                  : "更多文体"
              }
              className={clsx(
                "border rounded px-1 py-0.5 text-xs cursor-pointer focus:outline-none disabled:opacity-50",
                effectiveInOverflow
                  ? "wen-chip-active font-medium"
                  : "border-surface-300 bg-surface-200/50 text-ink-500",
              )}
            >
              <option value="" disabled>
                更多
              </option>
              {overflowStyles.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </div>
      <label
        className="flex items-center gap-1 text-xs text-ink-500 shrink-0 border-l border-surface-300 pl-1.5"
        title={`风格浓度：数值越低越克制；${meta?.label ?? "当前文体"}上限 ${sliderMax}%`}
      >
        <span className="text-ink-400 whitespace-nowrap">浓度</span>
        <input
          type="range"
          min={rangeMin}
          max={rangeMax}
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
          style={{
            background: intensityTrackBackground(
              sliderVal,
              rangeMin,
              rangeMax,
              sliderMax,
            ),
          }}
          className="w-16 h-1 rounded-full appearance-none cursor-pointer accent-primary-500 disabled:opacity-50 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-500 [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-sm"
        />
        <span className="text-ink-700 font-medium tabular-nums w-7 text-right">
          {sliderVal}%
        </span>
      </label>
      {showConvertButton && onRestorePlain ? (
        <button
          type="button"
          onClick={onRestorePlain}
          disabled={restorePlainDisabled || convertLoading}
          title="恢复为本次写作中、首次「风格转换」前的正文（本地缓存，不调用 AI）"
          className="wen-btn shrink-0 border-l border-surface-300 pl-1.5 text-xs disabled:opacity-50"
        >
          恢复正式
        </button>
      ) : null}
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
