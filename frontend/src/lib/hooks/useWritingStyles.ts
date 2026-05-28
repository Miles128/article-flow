"use client";

import { useEffect, useState } from "react";
import { writingApi } from "@/lib/api/client";
import {
  FALLBACK_DEFAULT_STYLE,
  FALLBACK_INTENSITY,
  FALLBACK_WRITING_STYLES,
  normalizeWritingStylesPayload,
  type StyleIntensityRange,
  type WritingStyleOption,
} from "@/lib/writingStyles";

export function useWritingStyles() {
  const [styles, setStyles] = useState<WritingStyleOption[]>(
    FALLBACK_WRITING_STYLES,
  );
  const [defaultStyle, setDefaultStyle] = useState(FALLBACK_DEFAULT_STYLE);
  const [intensityRange, setIntensityRange] =
    useState<StyleIntensityRange>(FALLBACK_INTENSITY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    writingApi
      .getStyles()
      .then((resp) => {
        if (cancelled) return;
        const normalized = normalizeWritingStylesPayload(resp.data);
        setStyles(normalized.styles);
        setDefaultStyle(normalized.defaultStyle);
        setIntensityRange(normalized.intensityRange);
      })
      .catch(() => {
        /* 使用 fallback */
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { styles, defaultStyle, intensityRange, loaded };
}
