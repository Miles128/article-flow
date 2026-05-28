import { describe, expect, it } from "vitest";
import {
  clampStyleIntensity,
  defaultIntensityForStyle,
  FALLBACK_INTENSITY,
  FALLBACK_WRITING_STYLES,
  normalizeWritingStylesPayload,
} from "./writingStyles";

describe("clampStyleIntensity", () => {
  it("caps humorous at max_intensity", () => {
    expect(
      clampStyleIntensity(90, "humorous", FALLBACK_WRITING_STYLES, FALLBACK_INTENSITY),
    ).toBe(50);
  });

  it("uses style default for humorous", () => {
    expect(
      defaultIntensityForStyle("humorous", FALLBACK_WRITING_STYLES, FALLBACK_INTENSITY),
    ).toBe(28);
  });
});

describe("normalizeWritingStylesPayload", () => {
  it("parses intensity from API", () => {
    const { intensityRange } = normalizeWritingStylesPayload({
      default: "professional",
      intensity: { default: 40, min: 10, max: 80 },
      styles: [{ id: "professional", label: "正式", defaultIntensity: 60, maxIntensity: 70 }],
    });
    expect(intensityRange.max).toBe(80);
  });
});
