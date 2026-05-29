import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  FALLBACK_DEFAULT_INTENT,
  normalizeWritingIntentId,
  type WritingIntentId,
} from '@/lib/writingIntent';

type WritingIntentState = {
  intent: WritingIntentId;
  finishCoherence: boolean;
  insightPass: boolean;
  setIntent: (id: WritingIntentId) => void;
  setFinishCoherence: (v: boolean) => void;
  setInsightPass: (v: boolean) => void;
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

export const useWritingIntentStore = create<WritingIntentState>()(
  persist(
    (set) => ({
      intent: FALLBACK_DEFAULT_INTENT,
      finishCoherence: true,
      insightPass: true,
      setIntent: (id) => set({ intent: normalizeWritingIntentId(id) }),
      setFinishCoherence: (v) => set({ finishCoherence: v }),
      setInsightPass: (v) => set({ insightPass: v }),
    }),
    {
      name: 'article-flow-writing-intent',
      storage,
      partialize: (s) => ({
        intent: s.intent,
        finishCoherence: s.finishCoherence,
        insightPass: s.insightPass,
      }),
    },
  ),
);
