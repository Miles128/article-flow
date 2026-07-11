'use client';

import { StepNavigation } from '@/components/ui/StepNavigation';

type StepPageFrameProps = {
  title?: string;
  stepId?: number;
  subtitle?: string;
  titleAside?: React.ReactNode;
  actions?: React.ReactNode;
  wide?: boolean;
  fullWidth?: boolean;
  toolbarOnly?: boolean;
  hideToolbar?: boolean;
  children: React.ReactNode;
};

export function StepPageFrame({ title, stepId, subtitle, titleAside, actions, wide, fullWidth, toolbarOnly, hideToolbar, children }: StepPageFrameProps) {
  const containerClass = fullWidth
    ? toolbarOnly
      ? 'wen-step-page-frame w-full max-w-none px-0 pt-0 pb-0 wen-main-canvas'
      : 'wen-step-page-frame w-full max-w-none px-3 py-2 wen-main-canvas'
    : wide
      ? 'wen-step-page-frame px-6 py-4 max-w-5xl mx-auto'
      : 'wen-step-page-frame px-6 py-4 max-w-4xl mx-auto';

  const toolbarClass = toolbarOnly
    ? 'wen-toolbar-seamless mb-0 flex-nowrap gap-1 py-1.5 overflow-x-auto'
    : 'wen-toolbar mb-3 flex-wrap gap-y-2';

  return (
    <div className={containerClass}>
      {!hideToolbar ? (
      <div className={toolbarClass}>
        {toolbarOnly ? (
          <div className="flex items-center gap-1 flex-nowrap overflow-x-auto overflow-y-visible ml-auto w-full justify-end min-w-0">
            {actions}
            {stepId != null ? <StepNavigation currentStep={stepId} /> : null}
          </div>
        ) : (
          <>
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                {title ? <h1 className="wen-title shrink-0">{title}</h1> : null}
                {titleAside}
              </div>
              {subtitle ? <p className="text-xs text-ink-400 mt-0.5">{subtitle}</p> : null}
            </div>
            <div className="flex items-center gap-1 flex-wrap overflow-x-auto overflow-y-visible min-w-0 max-w-full justify-end">
              {actions}
              {stepId != null ? <StepNavigation currentStep={stepId} /> : null}
            </div>
          </>
        )}
      </div>
      ) : null}
      {children}
    </div>
  );
}
