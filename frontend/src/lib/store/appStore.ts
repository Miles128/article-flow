import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Project, WorkflowStep, EditorMode } from '@/types';

interface LLMConfig {
  apiKey: string;
  baseUrl: string;
  modelName: string;
  temperature: number;
}

interface AppState {
  currentProject: Project | null;
  currentStep: number;
  editorMode: EditorMode['mode'];
  isSaving: boolean;
  lastSavedAt: Date | null;
  sidebarOpen: boolean;
  llmConfig: LLMConfig;
  
  setCurrentProject: (project: Project | null) => void;
  setCurrentStep: (step: number) => void;
  setEditorMode: (mode: EditorMode['mode']) => void;
  setIsSaving: (saving: boolean) => void;
  toggleSidebar: () => void;
  setLlmConfig: (config: Partial<LLMConfig>) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentProject: null,
      currentStep: 1,
      editorMode: 'split',
      isSaving: false,
      lastSavedAt: null,
      sidebarOpen: true,
      llmConfig: {
        apiKey: '',
        baseUrl: 'https://api.openai.com/v1',
        modelName: 'gpt-3.5-turbo',
        temperature: 0.7,
      },
      
      setCurrentProject: (project) => set({ currentProject: project }),
      setCurrentStep: (step) => set({ currentStep: step }),
      setEditorMode: (mode) => set({ editorMode: mode }),
      setIsSaving: (saving) => set({ 
        isSaving: saving, 
        lastSavedAt: saving ? undefined : new Date() 
      }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setLlmConfig: (config) => set((state) => ({
        llmConfig: { ...state.llmConfig, ...config }
      })),
      reset: () => set({
        currentProject: null,
        currentStep: 1,
        editorMode: 'split',
        isSaving: false,
        lastSavedAt: null,
      }),
    }),
    {
      name: 'article-flow-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ llmConfig: state.llmConfig }),
    }
  )
);

export const workflowSteps: WorkflowStep[] = [
  {
    id: 1,
    name: '热搜选题',
    description: '多平台热搜聚合、热点趋势分析、智能选题挖掘',
    icon: 'TrendingUp',
    path: '/projects/[id]/hotnews',
    canSave: true,
    isBreakpoint: false,
  },
  {
    id: 2,
    name: '确定选题',
    description: '多维度评估、选题卡片管理、状态追踪',
    icon: 'Target',
    path: '/projects/[id]/topics',
    canSave: true,
    isBreakpoint: true,
  },
  {
    id: 3,
    name: '搜集资料',
    description: '多源内容采集、智能摘要生成、关键词提取',
    icon: 'Search',
    path: '/projects/[id]/research',
    canSave: true,
    isBreakpoint: false,
  },
  {
    id: 4,
    name: '列出大纲',
    description: 'AI 智能生成、拖拽式编辑、模板库支持',
    icon: 'ListOrdered',
    path: '/projects/[id]/outline',
    canSave: true,
    isBreakpoint: false,
  },
  {
    id: 5,
    name: '写出草稿',
    description: '大模型辅助写作、续写/润色/风格调整',
    icon: 'PenTool',
    path: '/projects/[id]/writing',
    canSave: true,
    isBreakpoint: true,
  },
  {
    id: 6,
    name: '修改审核',
    description: '评论批注、AI 合规检查、逻辑一致性分析',
    icon: 'CheckSquare',
    path: '/projects/[id]/review',
    canSave: true,
    isBreakpoint: false,
  },
  {
    id: 7,
    name: '格式处理',
    description: 'Markdown 规范化、多平台格式适配、一键转换',
    icon: 'Type',
    path: '/projects/[id]/format',
    canSave: true,
    isBreakpoint: false,
  },
];

export function getStepConfig(step: number): WorkflowStep | undefined {
  return workflowSteps.find(s => s.id === step);
}

export function getStepPath(step: number, projectId: string): string {
  const config = getStepConfig(step);
  if (!config) return '/';
  return config.path.replace('[id]', projectId);
}
