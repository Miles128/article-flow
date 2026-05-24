'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { loadDraftForStep, saveDraftContent, type DraftLoadResult } from '@/lib/contentFlow';
import { draftFallbackStep, useStepFromRoute } from '@/lib/hooks/useStepFromRoute';

type Options = {
  autoLoad?: boolean;
  autoSaveMs?: number;
  onLoaded?: (result: DraftLoadResult) => void;
};

export function useProjectDraft(opts: Options = {}) {
  const { autoLoad = true, autoSaveMs = 0, onLoaded } = opts;
  const params = useParams();
  const projectId = params.id as string | undefined;
  const { stepId } = useStepFromRoute();
  const [content, setContentState] = useState('');
  const [contentId, setContentId] = useState<string | null>(null);
  const [contentSource, setContentSource] = useState<DraftLoadResult['source']>('none');
  const [loading, setLoading] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentIdRef = useRef<string | null>(null);
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  useEffect(() => {
    contentIdRef.current = contentId;
  }, [contentId]);

  const load = useCallback(async () => {
    if (!projectId) return null;
    setLoading(true);
    try {
      const loaded = await loadDraftForStep(projectId, draftFallbackStep(stepId));
      setContentState(loaded.content);
      setContentId(loaded.contentId);
      setContentSource(loaded.source);
      onLoadedRef.current?.(loaded);
      return loaded;
    } finally {
      setLoading(false);
    }
  }, [projectId, stepId]);

  const save = useCallback(
    async (text?: string) => {
      if (!projectId) return null;
      const body = (text ?? content).trim();
      if (!body) return null;
      const id = await saveDraftContent(projectId, body, contentId);
      setContentId(id);
      setContentSource('saved');
      return id;
    },
    [projectId, content, contentId]
  );

  const setContent = useCallback(
    (value: string | ((prev: string) => string)) => {
      setContentState((prev) => {
        const next = typeof value === 'function' ? value(prev) : value;
        if (autoSaveMs > 0 && projectId && next.trim()) {
          if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
          saveTimerRef.current = setTimeout(() => {
            saveDraftContent(projectId, next, contentIdRef.current).then((id) => {
              contentIdRef.current = id;
              setContentId(id);
              setContentSource('saved');
            }).catch(() => {});
          }, autoSaveMs);
        }
        return next;
      });
    },
    [autoSaveMs, projectId]
  );

  useEffect(() => {
    if (autoLoad && projectId) load();
  }, [autoLoad, projectId, stepId, load]);

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    []
  );

  return {
    projectId,
    stepId,
    content,
    setContent,
    contentId,
    setContentId,
    contentSource,
    setContentSource,
    loading,
    load,
    save,
  };
}
