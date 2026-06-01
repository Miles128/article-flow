import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { WritingStyleToolbar } from "./WritingStyleToolbar";
import {
  FALLBACK_INTENSITY,
  FALLBACK_WRITING_STYLES,
} from "@/lib/writingStyles";

describe("WritingStyleToolbar", () => {
  it("renders style pills, overflow select, intensity slider and convert", () => {
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
    expect(screen.getByRole("button", { name: "正式" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "诗意" })).toBeInTheDocument();
    expect(screen.getByLabelText("更多文体")).toHaveValue("humorous");
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
