'use client';

import { useRouter, useParams } from 'next/navigation';
import { getStepPath, getWorkflowSteps } from '@/lib/store/appStore';
import { useAppStore } from '@/lib/store';
import { stepNumeral } from '@/lib/uiThemes';

interface StepNavigationProps {
  currentStep: number;
  totalSteps?: number;
}

export function StepNavigation({ currentStep, totalSteps }: StepNavigationProps) {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const { currentProject } = useAppStore();
  const stepsTotal = totalSteps ?? getWorkflowSteps(currentProject?.contentType).length;

  return (
    <div className="wen-step-pager" aria-label="步骤翻页">
      <button
        type="button"
        onClick={() =>
          currentStep > 1 &&
          router.push(getStepPath(currentStep - 1, projectId, currentProject?.contentType))
        }
        disabled={currentStep <= 1}
      >
        上一步
      </button>
      <span className="wen-step-pager-mark">
        {stepNumeral(currentStep)} / {stepNumeral(stepsTotal)}
      </span>
      <button
        type="button"
        onClick={() =>
          currentStep < stepsTotal &&
          router.push(getStepPath(currentStep + 1, projectId, currentProject?.contentType))
        }
        disabled={currentStep >= stepsTotal}
      >
        下一步
      </button>
    </div>
  );
}
