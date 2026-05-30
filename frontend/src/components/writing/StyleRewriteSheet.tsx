"use client";

import { useState } from "react";
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

type Profile = { _id: string; name: string };

type Props = {
  open: boolean;
  onClose: () => void;
  scopeLabel: string;
  styles: WritingStyleOption[];
  styleId: string;
  presetIntensity: number;
  intensityRange: StyleIntensityRange;
  profiles: Profile[];
  profileId: string;
  loading?: boolean;
  restoreDisabled?: boolean;
  onStyleChange: (id: string) => void;
  onPresetIntensityChange: (pct: number) => void;
  onProfileSelect: (id: string) => void;
  onRestorePlain: () => void;
  onApplyPreset: () => void;
  onApplyProfile: (profileId: string, intensity: number) => void;
  onSetProjectDefault: (id: string) => void;
};

export function StyleRewriteSheet({
  open,
  onClose,
  scopeLabel,
  styles,
  styleId,
  presetIntensity,
  intensityRange,
  profiles,
  profileId,
  loading = false,
  restoreDisabled = false,
  onStyleChange,
  onPresetIntensityChange,
  onProfileSelect,
  onRestorePlain,
  onApplyPreset,
  onApplyProfile,
  onSetProjectDefault,
}: Props) {
  const [tab, setTab] = useState<"builtin" | "profile">(
    profiles.length > 0 && profileId ? "profile" : "builtin",
  );
  const [profileIntensity, setProfileIntensity] = useState(45);
  const [setDefault, setSetDefault] = useState(true);

  const meta = styles.find((s) => s.id === styleId);
  const sliderMax = Math.min(
    intensityRange.max,
    meta?.maxIntensity ?? intensityRange.max,
  );
  const presetVal = clampStyleIntensity(
    presetIntensity,
    styleId,
    styles,
    intensityRange,
  );
  const presetLabel = writingTargetStyleLabel(styleId, styles);
  const profileVal = clampStyleIntensity(
    profileIntensity,
    "professional",
    [],
    intensityRange,
  );
  const profileName =
    profiles.find((p) => p._id === profileId)?.name ?? "未选择";
  const scopeShort = scopeLabel.includes("选中") ? "选中" : "全文";

  const span = intensityRange.max - intensityRange.min;
  const fillPct =
    span > 0 ? ((presetVal - intensityRange.min) / span) * 100 : 0;
  const capPct =
    span > 0 ? ((sliderMax - intensityRange.min) / span) * 100 : 100;

  return (
    <WritingBottomSheet
      open={open}
      onClose={onClose}
      title="改风格"
      scopeLabel={scopeLabel}
      subtitle="换语气、换写法：内置文体或你的范文档案，二选一即可。"
      footer={
        <div className="flex flex-wrap gap-2 justify-end mt-4">
          <WritingFloatChip disabled={loading} onClick={onClose}>
            取消
          </WritingFloatChip>
          {tab === "builtin" ? (
            <>
              <WritingFloatChip
                disabled={loading || restoreDisabled}
                onClick={onRestorePlain}
              >
                恢复转换前
              </WritingFloatChip>
              <WritingFloatSeal disabled={loading} onClick={onApplyPreset}>
                {loading ? <Loader2 className="animate-spin" size={14} /> : null}
                按「{presetLabel}」{presetVal}% 改写{scopeShort}
              </WritingFloatSeal>
            </>
          ) : (
            <WritingFloatSeal
              disabled={loading || !profileId}
              onClick={() => {
                if (setDefault && profileId) onSetProjectDefault(profileId);
                onApplyProfile(profileId, profileVal);
              }}
            >
              {loading ? <Loader2 className="animate-spin" size={14} /> : null}
              按「{profileName}」{profileVal}% 改写{scopeShort}
            </WritingFloatSeal>
          )}
        </div>
      }
    >
      <div className="flex gap-2 mb-4">
        <WritingFloatChip
          active={tab === "builtin"}
          disabled={loading}
          onClick={() => setTab("builtin")}
        >
          内置文风
        </WritingFloatChip>
        <WritingFloatChip
          active={tab === "profile"}
          disabled={loading}
          onClick={() => setTab("profile")}
        >
          我的档案
        </WritingFloatChip>
      </div>

      {tab === "builtin" ? (
        <>
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
                <span className="font-kaiti text-sm text-ink-900 block">
                  {s.label}
                </span>
                {s.description ? (
                  <span className="text-[0.62rem] text-ink-400 leading-snug block mt-0.5">
                    {s.description}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 text-sm text-ink-500">
            <span className="shrink-0">浓度</span>
            <input
              type="range"
              min={intensityRange.min}
              max={intensityRange.max}
              step={1}
              value={presetVal}
              disabled={loading}
              className="flex-1"
              style={{
                accentColor: "var(--btn-seal-bg, #b84a32)",
                background: `linear-gradient(to right, var(--btn-seal-bg, #b84a32) 0%, var(--btn-seal-bg, #b84a32) ${fillPct}%, var(--paper-line, #d9c9a8) ${fillPct}%, var(--paper-line, #d9c9a8) ${capPct}%, #e8e2d6 ${capPct}%)`,
              }}
              onChange={(e) =>
                onPresetIntensityChange(
                  clampStyleIntensity(
                    Number(e.target.value),
                    styleId,
                    styles,
                    intensityRange,
                  ),
                )
              }
            />
            <strong className="text-ink-800 tabular-nums w-8 text-right shrink-0">
              {presetVal}%
            </strong>
          </div>
        </>
      ) : profiles.length === 0 ? (
        <p className="text-sm text-ink-500">
          暂无风格档案。可从范文分析后保存，再在此选用。
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-2 mb-4">
            {profiles.map((p) => (
              <button
                key={p._id}
                type="button"
                disabled={loading}
                onClick={() => onProfileSelect(p._id)}
                className={clsx(
                  "wen-sheet-style-card flex items-start gap-2 text-left w-full",
                  p._id === profileId && "wen-sheet-style-card-selected",
                )}
              >
                <span
                  className={clsx(
                    "mt-1.5 w-2 h-2 rounded-full shrink-0",
                    p._id === profileId ? "bg-primary-700" : "bg-surface-300",
                  )}
                  aria-hidden
                />
                <span className="font-kaiti text-sm text-ink-900">{p.name}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 text-sm text-ink-500 mb-3">
            <span className="shrink-0">浓度</span>
            <input
              type="range"
              min={intensityRange.min}
              max={intensityRange.max}
              value={profileVal}
              disabled={loading}
              className="flex-1 accent-primary-500"
              onChange={(e) => setProfileIntensity(Number(e.target.value))}
            />
            <strong className="text-ink-800 tabular-nums w-8 text-right shrink-0">
              {profileVal}%
            </strong>
          </div>
          <label className="flex items-center gap-2 text-xs text-ink-500 cursor-pointer">
            <input
              type="checkbox"
              checked={setDefault}
              disabled={loading || !profileId}
              onChange={(e) => setSetDefault(e.target.checked)}
            />
            设为项目默认档案
          </label>
        </>
      )}
    </WritingBottomSheet>
  );
}
