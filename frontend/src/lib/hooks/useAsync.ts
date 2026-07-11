'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { showToast, type ToastType } from '@/components/ui/Toast';
import { getApiError } from '@/lib/apiError';

interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseAsyncOptions {
  /** 是否在挂载时自动执行 */
  immediate?: boolean;
  /** 错误时是否显示 Toast */
  showToastOnError?: boolean;
  /** 成功时的 Toast 消息 */
  successMessage?: string;
}

/**
 * 通用异步数据请求 Hook
 * 
 * 用法:
 * const { data, loading, error, execute } = useAsync(() => api.getData());
 * 
 * // 手动执行
 * await execute();
 * 
 * // 自动执行（默认）
 * const { data, loading } = useAsync(() => api.getData(), { immediate: true });
 */
export function useAsync<T>(
  asyncFn: () => Promise<T>,
  options: UseAsyncOptions = {}
) {
  const { immediate = true, showToastOnError = true, successMessage } = options;

  const [state, setState] = useState<UseAsyncState<T>>({
    data: null,
    loading: immediate,
    error: null,
  });

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(async (...args: unknown[]) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await asyncFn();
      if (mountedRef.current) {
        setState({ data: result, loading: false, error: null });
      }
      if (successMessage) {
        showToast('success', successMessage);
      }
      return result;
    } catch (err: any) {
      const errorMsg = getApiError(err);
      if (mountedRef.current) {
        setState(prev => ({ ...prev, loading: false, error: errorMsg }));
      }
      if (showToastOnError) {
        showToast('error', errorMsg);
      }
      throw err;
    }
  }, [asyncFn, showToastOnError, successMessage]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    ...state,
    execute,
    /** 重新加载数据 */
    reload: execute,
  };
}

/**
 * 通用异步操作 Hook（不自动执行，用于表单提交等场景）
 */
export function useAsyncAction<T = void>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (
    asyncFn: () => Promise<T>,
    options?: { successMessage?: string; showToastOnError?: boolean }
  ): Promise<T | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await asyncFn();
      setLoading(false);
      if (options?.successMessage) {
        showToast('success', options.successMessage);
      }
      return result;
    } catch (err: any) {
      const errorMsg = getApiError(err);
      setLoading(false);
      setError(errorMsg);
      if (options?.showToastOnError !== false) {
        showToast('error', errorMsg);
      }
      return null;
    }
  }, []);

  return { loading, error, execute };
}
