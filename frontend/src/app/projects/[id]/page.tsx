'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppStore, workflowSteps, getStepPath } from '@/lib/store';
import { 
  TrendingUp, 
  Target, 
  Search, 
  ListOrdered, 
  PenTool, 
  CheckSquare, 
  Type,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { clsx } from 'clsx';

const stepIcons: Record<string, React.ElementType> = {
  TrendingUp,
  Target,
  Search,
  ListOrdered,
  PenTool,
  CheckSquare,
  Format,
};

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const { currentProject, setCurrentStep } = useAppStore();

  const projectId = params.id as string;

  useEffect(() => {
    if (currentProject) {
      setCurrentStep(currentProject.currentStep || 1);
    }
  }, [currentProject]);

  if (!currentProject) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl border border-gray-200 p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">写作工作流</h2>
        <p className="text-gray-500 mb-8">
          选择一个步骤开始或继续您的文章写作。您可以随时从任一环节开始或跳转。
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workflowSteps.map((step) => {
            const Icon = stepIcons[step.icon];
            const isActive = currentProject.currentStep === step.id;
            const stepPath = getStepPath(step.id, currentProject._id);

            return (
              <Link
                key={step.id}
                href={stepPath}
                className={clsx(
                  'group flex items-center gap-4 p-4 rounded-xl border-2 transition-all',
                  isActive
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                )}
              >
                <div className={clsx(
                  'w-12 h-12 rounded-xl flex items-center justify-center',
                  isActive
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-500 group-hover:bg-primary-100 group-hover:text-primary-600'
                )}>
                  <Icon size={24} />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={clsx(
                      'text-sm font-bold',
                      isActive ? 'text-primary-600' : 'text-gray-400'
                    )}>
                      步骤 {step.id}
                    </span>
                    {step.isBreakpoint && (
                      <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                        断点
                      </span>
                    )}
                    {isActive && (
                      <span className="px-2 py-0.5 text-xs bg-primary-100 text-primary-700 rounded-full">
                        当前步骤
                      </span>
                    )}
                  </div>
                  <h3 className={clsx(
                    'font-semibold',
                    isActive ? 'text-primary-700' : 'text-gray-900 group-hover:text-primary-600'
                  )}>
                    {step.name}
                  </h3>
                  <p className="text-sm text-gray-500 line-clamp-1">
                    {step.description}
                  </p>
                </div>

                <ChevronRight size={20} className={clsx(
                  'transition-colors',
                  isActive ? 'text-primary-500' : 'text-gray-300 group-hover:text-primary-500'
                )} />
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">写作进度</h3>
          <p className="text-2xl font-bold text-gray-900">
            {currentProject.wordCount} / {currentProject.targetWordCount}
          </p>
          <p className="text-sm text-gray-500 mt-1">字</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
            <div
              className="bg-primary-500 h-2 rounded-full"
              style={{ 
                width: `${Math.min(100, Math.round((currentProject.wordCount / currentProject.targetWordCount) * 100))}%` 
              }}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">AI 味检测</h3>
          <p className="text-2xl font-bold">
            <span className={clsx(
              currentProject.aiTasteScore < 30 ? 'text-green-600' :
              currentProject.aiTasteScore < 50 ? 'text-yellow-600' : 'text-red-600'
            )}>
              {currentProject.aiTasteScore}%
            </span>
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {currentProject.aiTasteScore < 30 ? 'AI味低，继续保持' :
             currentProject.aiTasteScore < 50 ? 'AI味中等，建议优化' : 'AI味较高，需要修改'}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">工作区类型</h3>
          <p className="text-2xl font-bold text-gray-900 capitalize">
            {currentProject.workspace === 'wechat' ? '公众号' :
             currentProject.workspace === 'video' ? '视频脚本' : '通用写作'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {currentProject.workspace === 'wechat' ? '段落短小，对话式风格' :
             currentProject.workspace === 'video' ? '口语化，适合旁白' : '标准文章格式'}
          </p>
        </div>
      </div>
    </div>
  );
}
