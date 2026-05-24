import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Project, WorkflowStep, EditorMode } from '@/types';

interface WorkspaceConfig {
  path: string;
  type: string;
}

interface AppState {
  currentProject: Project | null;
  currentStep: number;
  editorMode: EditorMode['mode'];
  isSaving: boolean;
  lastSavedAt: Date | null;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  workspace: WorkspaceConfig;
  showWorkspacePicker: boolean;
  workspaceFiles: Array<{ name: string; path: string }>;
  
  setCurrentProject: (project: Project | null) => void;
  setCurrentStep: (step: number) => void;
  setEditorMode: (mode: EditorMode['mode']) => void;
  setIsSaving: (saving: boolean) => void;
  toggleSidebar: () => void;
  toggleSidebarCollapsed: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setWorkspace: (workspace: WorkspaceConfig) => void;
  setShowWorkspacePicker: (show: boolean) => void;
  setWorkspaceFiles: (files: Array<{ name: string; path: string }>) => void;
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
      sidebarOpen: false,
      sidebarCollapsed: false,
      workspace: {
        path: '',
        type: 'general',
      },
      showWorkspacePicker: false,
      workspaceFiles: [],
      
      setCurrentProject: (project) => set({ currentProject: project }),
      setCurrentStep: (step) => set({ currentStep: step }),
      setEditorMode: (mode) => set({ editorMode: mode }),
      setIsSaving: (saving) => set({ 
        isSaving: saving, 
        lastSavedAt: saving ? undefined : new Date() 
      }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      toggleSidebarCollapsed: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setWorkspace: (workspace) => set({ workspace }),
      setShowWorkspacePicker: (show) => set({ showWorkspacePicker: show }),
      setWorkspaceFiles: (files) => set({ workspaceFiles: files }),
      reset: () => set({
        currentProject: null,
        currentStep: 1,
        editorMode: 'split',
        isSaving: false,
        lastSavedAt: null,
      }),
    }),
    {
      name: 'article-flow-storage-v2',
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => undefined,
            removeItem: () => undefined,
          };
        }
        try {
          return window.localStorage;
        } catch {
          return {
            getItem: () => null,
            setItem: () => undefined,
            removeItem: () => undefined,
          };
        }
      }),
      partialize: (state) => ({
        workspace: { path: state.workspace.path, type: state.workspace.type },
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);

export type ContentType = 'script' | 'article' | 'general';

export const CONTENT_TYPE_CONFIG: Record<ContentType, { label: string; icon: string; description: string }> = {
  script: { label: '口播稿', icon: 'Mic', description: '视频/音频脚本，口语化、短句、节奏感' },
  article: { label: '文章型', icon: 'FileText', description: '公众号/知乎等长文，结构化、有深度' },
  general: { label: '普通型', icon: 'MessageSquare', description: '小红书/即刻等短内容，观点直给、配图重要' },
};

export const CONTENT_TYPE_STEPS: Record<ContentType, WorkflowStep[]> = {
  script: [
    { id: 1, name: '选题灵感', description: '热搜聚合、竞品话题扫描、灵感捕捉', icon: 'TrendingUp', path: '/projects/[id]/hotnews', canSave: true, isBreakpoint: false },
    { id: 2, name: '竞品分析', description: 'B站/小红书搜同话题爆款、结构拆解、话术提取', icon: 'Search', path: '/projects/[id]/research', canSave: true, isBreakpoint: false },
    { id: 3, name: '列出提纲', description: '钩子设计、分镜规划、转场标注', icon: 'ListOrdered', path: '/projects/[id]/outline', canSave: true, isBreakpoint: true },
    { id: 4, name: '写出草稿', description: '口语风格写作，150-180字/分钟节奏', icon: 'PenTool', path: '/projects/[id]/writing', canSave: true, isBreakpoint: true },
    { id: 5, name: '口语化审校', description: '去书面腔、加口语词、可朗读性检查、合规检查', icon: 'CheckSquare', path: '/projects/[id]/review', canSave: true, isBreakpoint: false },
    { id: 6, name: '导出脚本', description: '导出脚本表格、分镜表、口播提示卡', icon: 'Type', path: '/projects/[id]/format', canSave: true, isBreakpoint: false },
  ],
  article: [
    { id: 1, name: '热搜选题', description: '多平台热搜聚合、热点趋势分析、智能选题挖掘', icon: 'TrendingUp', path: '/projects/[id]/hotnews', canSave: true, isBreakpoint: false },
    { id: 2, name: '确定选题', description: '多维度评估、选题卡片管理、状态追踪', icon: 'Target', path: '/projects/[id]/topics', canSave: true, isBreakpoint: true },
    { id: 3, name: '搜集资料', description: '多源采集、主张登记、来源核查', icon: 'Search', path: '/projects/[id]/research', canSave: true, isBreakpoint: false },
    { id: 4, name: '列出大纲', description: 'AI 生成、信息/经验型章节标记', icon: 'ListOrdered', path: '/projects/[id]/outline', canSave: true, isBreakpoint: false },
    { id: 5, name: '写出草稿', description: '按节写作、多模式、去AI味实时检测', icon: 'PenTool', path: '/projects/[id]/writing', canSave: true, isBreakpoint: true },
    { id: 6, name: '标题工坊', description: '爆款标题、副标题、封面文案', icon: 'Type', path: '/projects/[id]/titles', canSave: true, isBreakpoint: false },
    { id: 7, name: '修改审核', description: '内容→风格→细节 三轮审校流水线', icon: 'CheckSquare', path: '/projects/[id]/review', canSave: true, isBreakpoint: false },
    { id: 8, name: '格式处理', description: 'Markdown 规范化、多平台格式适配', icon: 'FileText', path: '/projects/[id]/format', canSave: true, isBreakpoint: false },
    { id: 9, name: '生成配图', description: '多配色方案、HTML 配图输出', icon: 'Image', path: '/projects/[id]/illustration', canSave: true, isBreakpoint: false },
    { id: 10, name: '发布准备', description: '发布清单、导出包、最终检查', icon: 'Rocket', path: '/projects/[id]/publish', canSave: true, isBreakpoint: false },
  ],
  general: [
    { id: 1, name: '选题灵感', description: '多平台热搜聚合、爆款话题捕捉、灵感收集', icon: 'TrendingUp', path: '/projects/[id]/hotnews', canSave: true, isBreakpoint: false },
    { id: 2, name: '写草稿', description: '200-500字短内容、观点直给、金句驱动', icon: 'PenTool', path: '/projects/[id]/writing', canSave: true, isBreakpoint: true },
    { id: 3, name: '卡片配图', description: '22色系可选、一键生成竖版卡片', icon: 'Image', path: '/projects/[id]/illustration', canSave: true, isBreakpoint: false },
    { id: 4, name: '发布', description: '多平台格式适配、一键发布到小红书等', icon: 'Type', path: '/projects/[id]/format', canSave: true, isBreakpoint: false },
  ],
};

export function getWorkflowSteps(contentType?: string): WorkflowStep[] {
  const ct = (contentType || 'article') as ContentType;
  return CONTENT_TYPE_STEPS[ct] || CONTENT_TYPE_STEPS.article;
}

export function getContentTypeSteps(contentType?: ContentType | string): WorkflowStep[] {
  return getWorkflowSteps(contentType);
}

export function getStepConfig(step: number, contentType?: string): WorkflowStep | undefined {
  const steps = getWorkflowSteps(contentType);
  return steps.find(s => s.id === step);
}

export function getStepPath(step: number, projectId: string, contentType?: string): string {
  const config = getStepConfig(step, contentType);
  if (!config) return '/';
  return config.path.replace('[id]', projectId);
}
