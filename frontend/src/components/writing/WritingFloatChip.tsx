"use client";

import { clsx } from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  active?: boolean;
  variant?: "default" | "seal";
};

export function WritingFloatChip({
  children,
  active = false,
  variant = "default",
  className,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      className={clsx(
        "wen-float-chip",
        variant === "seal" && "wen-float-chip-seal",
        active && "wen-float-chip-active",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function WritingFloatSeal({
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button type="button" className={clsx("wen-float-seal", className)} {...rest}>
      {children}
    </button>
  );
}
