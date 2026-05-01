'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  TrendingUp, 
  Target, 
  Search, 
  ListOrdered, 
  PenTool, 
  CheckSquare, 
  Type,
  Home,
  Menu,
  X
} from 'lucide-react';
import { useAppStore, workflowSteps, getStepPath } from '@/lib/store';
import { clsx } from 'clsx';

const stepIcons: Record<string, React.ElementType> = {
  TrendingUp,
  Target,
  Search,
  ListOrdered,
  PenTool,
  CheckSquare,
  Type,
};

export function Sidebar() {
  const pathname = usePathname();
  const { currentProject, currentStep, sidebarOpen, toggleSidebar } = useAppStore();
  
  const getIcon = (iconName: string) => {
    const Icon = stepIcons[iconName] || Home;
    return Icon;
  };
  
  return (
    <>
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg md:hidden"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
      
      <aside
        className={clsx(
          'fixed left-0 top-0 h-full w-64 bg-gray-50 border-r border-gray-200 z-40 transition-transform duration-300',
          'md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="p-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-gray-900">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <PenTool size={18} className="text-white" />
            </div>
            Article Flow
          </Link>
        </div>
        
        <nav className="px-4 space-y-1">
          <Link
            href="/"
            className={clsx(
              'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
              pathname === '/' 
                ? 'bg-primary-100 text-primary-700' 
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            <Home size={18} />
            项目列表
          </Link>
          
          {currentProject && (
            <div className="mt-6">
              <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                工作流
              </p>
              
              {workflowSteps.map((step) => {
                const Icon = getIcon(step.icon);
                const isActive = currentStep === step.id;
                const stepPath = getStepPath(step.id, currentProject._id);
                
                return (
                  <Link
                    key={step.id}
                    href={stepPath}
                    className={clsx(
                      'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    <div className={clsx(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                      isActive 
                        ? 'bg-primary-500 text-white' 
                        : 'bg-gray-200 text-gray-500'
                    )}>
                      {step.id}
                    </div>
                    <span className="flex-1">{step.name}</span>
                    {step.isBreakpoint && (
                      <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                        断点
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </nav>
        
        {currentProject && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">当前项目</p>
              <p className="text-sm font-medium text-gray-900 truncate">
                {currentProject.title}
              </p>
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                <span className="capitalize">{currentProject.workspace}</span>
                <span>•</span>
                <span>{currentProject.wordCount} / {currentProject.targetWordCount} 字</span>
              </div>
            </div>
          </div>
        )}
      </aside>
      
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={toggleSidebar}
        />
      )}
    </>
  );
}
