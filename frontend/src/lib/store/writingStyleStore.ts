import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type WritingStyleState = {
  targetStyle: string;
  /** 各文体 id → 上次使用的浓度（%） */
  intensityByStyle: Record<string, number>;

  setTargetStyle: (id: string) => void;
  setIntensityForStyle: (styleId: string, pct: number) => void;
};

const storage = createJSONStorage(() => {
  if (typeof window === 'undefined') {
    return {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    };
  }
  try {
    return window.localStorage;
  } catch {
    return {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    };
  }
});

export const useWritingStyleStore = create<WritingStyleState>()(
  persist(
    (set) => ({
      targetStyle: 'professional',
      intensityByStyle: {},

      setTargetStyle: (id) => set({ targetStyle: id }),
      setIntensityForStyle: (styleId, pct) =>
        set((s) => ({
          intensityByStyle: {
            ...s.intensityByStyle,
            [styleId]: Math.round(pct),
          },
        })),
    }),
    {
      name: 'article-flow-writing-style',
      storage,
      partialize: (s) => ({
        targetStyle: s.targetStyle,
        intensityByStyle: s.intensityByStyle,
      }),
    },
  ),
);
