"use client";

import { useEffect, useState } from "react";
import { writingApi } from "@/lib/api/client";
import {
  FALLBACK_DEFAULT_INTENT,
  FALLBACK_WRITING_INTENTS,
  normalizeWritingIntentId,
  type WritingIntentId,
  type WritingIntentOption,
} from "@/lib/writingIntent";

export function useWritingIntents() {
  const [intents, setIntents] = useState<WritingIntentOption[]>(
    FALLBACK_WRITING_INTENTS,
  );
  const [defaultIntent, setDefaultIntent] = useState<WritingIntentId>(
    FALLBACK_DEFAULT_INTENT,
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    writingApi
      .getIntents()
      .then((resp) => {
        if (cancelled) return;
        const data = resp.data as {
          default?: string;
          intents?: WritingIntentOption[];
        };
        if (data.intents?.length) {
          setIntents(
            data.intents.map((i) => ({
              id: normalizeWritingIntentId(i.id),
              label: i.label,
              description: i.description,
            })),
          );
        }
        if (data.default) {
          setDefaultIntent(normalizeWritingIntentId(data.default));
        }
      })
      .catch(() => {
        /* fallback */
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { intents, defaultIntent, loaded };
}
