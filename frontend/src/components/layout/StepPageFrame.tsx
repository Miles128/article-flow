'use client';

import { StepNavigation } from '@/components/ui/StepNavigation';

type StepPageFrameProps = {
  title: string;
  stepId?: number;
  subtitle?: string;
  actions?: React.ReactNode;
  wide?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
};

export function StepPageFrame({ title, stepId, subtitle, actions, wide, fullWidth, children }: StepPageFrameProps) {
  const containerClass = fullWidth
    ? 'w-full max-w-none px-2 py-2'
    : wide
      ? 'px-6 py-4 max-w-5xl mx-auto'
      : 'px-6 py-4 max-w-4xl mx-auto';

  return (
    <div className={containerClass}>
      <div className="wen-toolbar mb-4 flex-wrap gap-y-2">
        <div>
          <h1 className="wen-title">{title}</h1>
          {subtitle ? <p className="text-xs text-ink-400 mt-0.5">{subtitle}</p> : null}
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {actions}
          {stepId != null ? <StepNavigation currentStep={stepId} /> : null}
        </div>
      </div>
      {children}
    </div>
  );
}
