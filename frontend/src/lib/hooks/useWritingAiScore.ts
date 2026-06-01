"use client";

import { useEffect, useRef, useState } from "react";
import { writingApi } from "@/lib/api/client";

const DEBOUNCE_MS = 900;

export function useWritingAiScore(content: string, enabled: boolean) {
  const [score, setScore] = useState<number | null>(null);
  const [targetScore, setTargetScore] = useState(30);
  const [loading, setLoading] = useState(false);
  const reqId = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setScore(null);
      setLoading(false);
      return;
    }
    const trimmed = content.trim();
    if (!trimmed) {
      setScore(null);
      setLoading(false);
      return;
    }

    const timer = window.setTimeout(() => {
      const id = ++reqId.current;
      setLoading(true);
      void writingApi
        .scanAiRules(trimmed)
        .then((resp) => {
          if (id !== reqId.current) return;
          setScore(resp.data.score);
          setTargetScore(resp.data.targetScore ?? 30);
        })
        .catch(() => {
          if (id !== reqId.current) return;
          setScore(null);
        })
        .finally(() => {
          if (id === reqId.current) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [content, enabled]);

  return { score, targetScore, loading };
}
