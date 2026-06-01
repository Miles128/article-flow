"use client";

import { create } from "zustand";
import type { ReactNode } from "react";

type WritingToolbarSlotState = {
  actions: ReactNode | null;
  setActions: (actions: ReactNode | null) => void;
};

export const useWritingToolbarSlot = create<WritingToolbarSlotState>((set) => ({
  actions: null,
  setActions: (actions) => set({ actions }),
}));
