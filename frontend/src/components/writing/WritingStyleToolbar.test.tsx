import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { WritingStyleToolbar } from "./WritingStyleToolbar";
import {
  FALLBACK_INTENSITY,
  FALLBACK_WRITING_STYLES,
} from "@/lib/writingStyles";

// 构造超过 PILL_STYLE_COUNT(5) 的样式列表，使 overflow select 渲染
const STYLES_WITH_OVERFLOW = [
  ...FALLBACK_WRITING_STYLES,
  { id: "satirical", label: "讽刺", defaultIntensity: 30, maxIntensity: 60 },
  { id: "dramatic", label: "戏剧", defaultIntensity: 40, maxIntensity: 70 },
];

describe("WritingStyleToolbar", () => {
  it("renders style pills, overflow select, intensity slider and convert", () => {
    render(
      <WritingStyleToolbar
        value="satirical"
        intensity={28}
        styles={STYLES_WITH_OVERFLOW}
        defaultStyle="professional"
        intensityRange={FALLBACK_INTENSITY}
        onChange={vi.fn()}
        onIntensityChange={vi.fn()}
        onConvert={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "正式" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "诗意" })).toBeInTheDocument();
    expect(screen.getByLabelText("更多文体")).toHaveValue("satirical");
    expect(screen.getByText("浓度")).toBeInTheDocument();
    expect(screen.getByText("28%")).toBeInTheDocument();
    expect(screen.getByRole("slider")).toHaveAttribute("max", "85");
    expect(screen.getByRole("slider")).toHaveValue("28");
  });

  it("calls onChange when a style pill is clicked", () => {
    const onChange = vi.fn();
    render(
      <WritingStyleToolbar
        value="professional"
        intensity={55}
        styles={FALLBACK_WRITING_STYLES}
        defaultStyle="professional"
        intensityRange={FALLBACK_INTENSITY}
        onChange={onChange}
        onIntensityChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "轻松" }));
    expect(onChange).toHaveBeenCalledWith("casual");
  });
});
