/** 成稿目标风格（与 backend/config/writing_styles.yaml 对齐） */

export type WritingStyleOption = {
  id: string;
  label: string;
  description?: string;
  defaultIntensity?: number;
  maxIntensity?: number;
};

export type StyleIntensityRange = {
  default: number;
  min: number;
  max: number;
};

export type WritingStylesPayload = {
  default: string;
  intensity?: StyleIntensityRange;
  styles: WritingStyleOption[];
};

export const FALLBACK_INTENSITY: StyleIntensityRange = {
  default: 45,
  min: 15,
  max: 85,
};

export const FALLBACK_WRITING_STYLES: WritingStyleOption[] = [
  {
    id: "professional",
    label: "正式",
    description: "商务、报告、专业文章",
    defaultIntensity: 55,
    maxIntensity: 75,
  },
  {
    id: "casual",
    label: "轻松",
    defaultIntensity: 45,
    maxIntensity: 70,
  },
  {
    id: "academic",
    label: "学术",
    defaultIntensity: 50,
    maxIntensity: 80,
  },
  {
    id: "poetic",
    label: "诗意",
    defaultIntensity: 28,
    maxIntensity: 45,
  },
  {
    id: "humorous",
    label: "幽默",
    description: "轻松活泼、有梗",
    defaultIntensity: 28,
    maxIntensity: 50,
  },
];

export const FALLBACK_DEFAULT_STYLE = "professional";

/** 从诗意/幽默等恢复时推荐的正式风格浓度 */
export const RESTORE_PLAIN_INTENSITY = 42;

export function normalizeWritingStylesPayload(
  raw: WritingStylesPayload | null | undefined,
): {
  defaultStyle: string;
  styles: WritingStyleOption[];
  intensityRange: StyleIntensityRange;
} {
  const styles =
    raw?.styles?.length &&
    raw.styles.every((s) => s.id && s.label)
      ? raw.styles
      : FALLBACK_WRITING_STYLES;
  const defaultStyle =
    raw?.default && styles.some((s) => s.id === raw.default)
      ? raw.default
      : FALLBACK_DEFAULT_STYLE;
  const intensityRange = raw?.intensity ?? FALLBACK_INTENSITY;
  return { defaultStyle, styles, intensityRange };
}

export function defaultIntensityForStyle(
  styleId: string,
  styles: WritingStyleOption[],
  intensityRange: StyleIntensityRange = FALLBACK_INTENSITY,
): number {
  const meta = styles.find((s) => s.id === styleId);
  return meta?.defaultIntensity ?? intensityRange.default;
}

export function clampStyleIntensity(
  value: number,
  styleId: string,
  styles: WritingStyleOption[],
  intensityRange: StyleIntensityRange = FALLBACK_INTENSITY,
): number {
  const meta = styles.find((s) => s.id === styleId);
  const cap = Math.min(intensityRange.max, meta?.maxIntensity ?? intensityRange.max);
  return Math.max(intensityRange.min, Math.min(cap, Math.round(value)));
}

/** 已下架的内置风格 id → 替代项（旧项目/工作区配置兼容） */
export const DEPRECATED_STYLE_ALIASES: Record<string, string> = {
  conversational: "casual",
};

export function normalizeWritingStyleId(styleId: string): string {
  return DEPRECATED_STYLE_ALIASES[styleId] ?? styleId;
}

export function writingTargetStyleLabel(
  id: string,
  styles: WritingStyleOption[] = FALLBACK_WRITING_STYLES,
): string {
  const key = normalizeWritingStyleId(id);
  return styles.find((s) => s.id === key)?.label ?? id;
}

/** @deprecated 使用 API 加载的 styles */
export const WRITING_TARGET_STYLES = FALLBACK_WRITING_STYLES;
export type WritingTargetStyleId = string;
export const DEFAULT_WRITING_TARGET_STYLE = FALLBACK_DEFAULT_STYLE;
