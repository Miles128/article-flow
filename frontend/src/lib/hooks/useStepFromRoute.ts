'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAppStore, getWorkflowSteps } from '@/lib/store/appStore';

/** 从 URL 路径解析当前工作流步骤 id */
export function stepIdFromPath(pathname: string, contentType?: string): number {
  const steps = getWorkflowSteps(contentType);
  const segment = pathname.replace(/\/$/, '').split('/').pop() || '';
  const found = steps.find((s) => s.path.endsWith(`/${segment}`));
  return found?.id ?? 1;
}

/** 草稿加载时传给 getPreviousStepContent 的 step 参数 */
export function draftFallbackStep(stepId: number): number {
  if (stepId <= 5) return stepId;
  return stepId - 1;
}

/** 同步 store 中的 currentStep 与当前路由 */
export function useStepFromRoute() {
  const pathname = usePathname();
  const { currentProject, setCurrentStep } = useAppStore();
  const contentType = currentProject?.contentType || 'article';
  const stepId = stepIdFromPath(pathname || '', contentType);
  const steps = getWorkflowSteps(contentType);

  useEffect(() => {
    setCurrentStep(stepId);
  }, [stepId, setCurrentStep]);

  return { stepId, contentType, steps };
}
