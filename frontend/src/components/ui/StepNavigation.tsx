'use client';

import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getStepPath, getWorkflowSteps } from '@/lib/store/appStore';
import { useAppStore } from '@/lib/store';

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
 <div className="inline-flex items-center gap-2 text-xs text-ink-500">
 <button
 type="button"
 onClick={() => currentStep > 1 && router.push(getStepPath(currentStep - 1, projectId, currentProject?.contentType))}
 disabled={currentStep <= 1}
 className="inline-flex items-center gap-0.5 hover:text-ink-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
 >
 <ChevronLeft size={12} strokeWidth={1.5} />
 上一步
 </button>
 <span className="text-[10px] text-ink-300 font-kaiti">{currentStep}/{stepsTotal}</span>
 <button
 type="button"
 onClick={() => currentStep < stepsTotal && router.push(getStepPath(currentStep + 1, projectId, currentProject?.contentType))}
 disabled={currentStep >= stepsTotal}
 className="inline-flex items-center gap-0.5 text-primary-600 hover:text-primary-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
 >
 下一步
 <ChevronRight size={12} strokeWidth={1.5} />
 </button>
 </div>
 );
}
