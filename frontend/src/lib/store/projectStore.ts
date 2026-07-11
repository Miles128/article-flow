import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Project } from '@/types';

interface ProjectState {
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;
}

export const useProjectStore = create<ProjectState>()((set) => ({
  currentProject: null,
  setCurrentProject: (project) => set({ currentProject: project }),
}));
