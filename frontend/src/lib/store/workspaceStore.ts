import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface WorkspaceConfig {
  path: string;
  type: string;
}

interface WorkspaceFiles {
  name: string;
  path: string;
}

interface WorkspaceState {
  workspace: WorkspaceConfig;
  showWorkspacePicker: boolean;
  workspaceFiles: WorkspaceFiles[];

  setWorkspace: (workspace: WorkspaceConfig) => void;
  setShowWorkspacePicker: (show: boolean) => void;
  setWorkspaceFiles: (files: WorkspaceFiles[]) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      workspace: { path: '', type: 'general' },
      showWorkspacePicker: false,
      workspaceFiles: [],

      setWorkspace: (workspace) => set({ workspace }),
      setShowWorkspacePicker: (show) => set({ showWorkspacePicker: show }),
      setWorkspaceFiles: (files) => set({ workspaceFiles: files }),
    }),
    {
      name: 'article-flow-workspace',
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          return { getItem: () => null, setItem: () => undefined, removeItem: () => undefined };
        }
        try {
          return window.localStorage;
        } catch {
          return { getItem: () => null, setItem: () => undefined, removeItem: () => undefined };
        }
      }),
      partialize: (state) => ({
        workspace: state.workspace,
      }),
    }
  )
);
