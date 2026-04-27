import type { Project, Workspace, WorkflowStep } from '$lib/server/db/schema';
import { getWorkspaceConfig, getStepConfig, type WorkspaceConfig, type WorkflowStepConfig } from '$lib/workflow';
import { writable } from 'svelte/store';

export interface AppState {
	currentProject: Project | null;
	workspaceConfig: WorkspaceConfig | null;
	stepConfig: WorkflowStepConfig | null;
	isSaving: boolean;
	lastSavedAt: Date | null;
	editMode: 'wysiwyg' | 'markdown' | 'split';
}

const initialState: AppState = {
	currentProject: null,
	workspaceConfig: null,
	stepConfig: null,
	isSaving: false,
	lastSavedAt: null,
	editMode: 'wysiwyg'
};

function createAppStore() {
	const { subscribe, set, update } = writable<AppState>(initialState);

	return {
		subscribe,
		setProject(project: Project | null) {
			update((state) => ({
				...state,
				currentProject: project,
				workspaceConfig: project ? getWorkspaceConfig(project.workspace as Workspace) : null,
				stepConfig: project ? getStepConfig(project.currentStep) : null
			}));
		},
		updateStep(step: WorkflowStep) {
			update((state) => ({
				...state,
				currentProject: state.currentProject ? { ...state.currentProject, currentStep: step } : null,
				stepConfig: getStepConfig(step)
			}));
		},
		setSaving(saving: boolean) {
			update((state) => ({
				...state,
				isSaving: saving,
				lastSavedAt: saving ? state.lastSavedAt : new Date()
			}));
		},
		setEditMode(mode: AppState['editMode']) {
			update((state) => ({
				...state,
				editMode: mode
			}));
		},
		reset() {
			set(initialState);
		}
	};
}

export const appStore = createAppStore();
