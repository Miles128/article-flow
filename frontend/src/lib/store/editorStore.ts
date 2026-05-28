import { create } from 'zustand';
import type { EditorMode } from '@/types';

interface EditorState {
  editorMode: EditorMode['mode'];
  isSaving: boolean;
  lastSavedAt: Date | null;

  setEditorMode: (mode: EditorMode['mode']) => void;
  setIsSaving: (saving: boolean) => void;
}

export const useEditorStore = create<EditorState>()((set) => ({
  editorMode: 'split',
  isSaving: false,
  lastSavedAt: null,

  setEditorMode: (mode) => set({ editorMode: mode }),
  setIsSaving: (saving) =>
    set({ isSaving: saving, lastSavedAt: saving ? undefined : new Date() }),
}));
