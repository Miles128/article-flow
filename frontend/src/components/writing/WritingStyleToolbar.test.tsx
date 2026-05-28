import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { WritingStyleToolbar } from "./WritingStyleToolbar";
import {
  FALLBACK_INTENSITY,
  FALLBACK_WRITING_STYLES,
} from "@/lib/writingStyles";

describe("WritingStyleToolbar", () => {
  it("renders style select, intensity slider and convert", () => {
    render(
      <WritingStyleToolbar
        value="humorous"
        intensity={28}
        styles={FALLBACK_WRITING_STYLES}
        defaultStyle="professional"
        intensityRange={FALLBACK_INTENSITY}
        onChange={vi.fn()}
        onIntensityChange={vi.fn()}
        onConvert={vi.fn()}
      />,
    );
    expect(screen.getByText("浓度")).toBeInTheDocument();
    expect(screen.getByText("28%")).toBeInTheDocument();
    expect(screen.getByRole("slider")).toHaveAttribute("max", "50");
  });
});
