import type { WorkflowStep } from '$lib/server/db/schema';

export type Workspace = 'wechat' | 'video' | 'general';

export interface WorkflowStepConfig {
	step: WorkflowStep;
	name: string;
	description: string;
	icon: string;
	canSave: boolean;
	isBreakpoint: boolean;
	breakpointName?: string;
}

export const workflowSteps: WorkflowStepConfig[] = [
	{
		step: 0,
		name: '创建项目',
		description: '选择工作区类型，设置项目基本信息',
		icon: 'Plus',
		canSave: false,
		isBreakpoint: false
	},
	{
		step: 1,
		name: '需求规格',
		description: '定义文章目标受众、核心观点、字数要求',
		icon: 'FileText',
		canSave: true,
		isBreakpoint: false
	},
	{
		step: 2,
		name: '信息调研',
		description: '收集相关资料、案例、数据支撑',
		icon: 'Search',
		canSave: true,
		isBreakpoint: false
	},
	{
		step: 3,
		name: '确定选题',
		description: '选择最终文章标题和结构大纲',
		icon: 'CheckCircle2',
		canSave: true,
		isBreakpoint: true,
		breakpointName: 'specification'
	},
	{
		step: 4,
		name: '素材搜索',
		description: '查找案例、数据、引用材料',
		icon: 'Layers',
		canSave: true,
		isBreakpoint: false
	},
	{
		step: 5,
		name: '撰写初稿',
		description: '完成文章主体内容撰写',
		icon: 'PenTool',
		canSave: true,
		isBreakpoint: true,
		breakpointName: 'draft'
	},
	{
		step: 6,
		name: '内容审校',
		description: '检查事实准确性、逻辑合理性',
		icon: 'Eye',
		canSave: true,
		isBreakpoint: false
	},
	{
		step: 7,
		name: '风格审校',
		description: '统一文风、调整语气、去 AI 味',
		icon: 'Palette',
		canSave: true,
		isBreakpoint: false
	},
	{
		step: 8,
		name: '细节审校',
		description: '校对错别字、标点、格式',
		icon: 'CheckSquare',
		canSave: true,
		isBreakpoint: false
	},
	{
		step: 9,
		name: '配图建议',
		description: '选择或生成文章配图',
		icon: 'Image',
		canSave: true,
		isBreakpoint: false
	},
	{
		step: 10,
		name: '最终检查',
		description: '整体审阅、确认发布准备',
		icon: 'ClipboardCheck',
		canSave: true,
		isBreakpoint: false
	},
	{
		step: 11,
		name: '发布准备',
		description: '导出文章、准备发布',
		icon: 'Send',
		canSave: true,
		isBreakpoint: false
	}
];

export interface WorkspaceConfig {
	type: Workspace;
	name: string;
	description: string;
	icon: string;
	rules: WorkspaceRules;
}

export interface WorkspaceRules {
	maxParagraphLength: number;
	style: 'formal' | 'casual' | 'conversational';
	averageSentenceLength: number;
	aiTasteTarget: number;
	voice?: string;
}

export const workspaceConfigs: WorkspaceConfig[] = [
	{
		type: 'wechat',
		name: '公众号',
		description: '适合微信公众号文章，段落短小，易读性强',
		icon: 'Smartphone',
		rules: {
			maxParagraphLength: 150,
			style: 'conversational',
			averageSentenceLength: 15,
			aiTasteTarget: 30
		}
	},
	{
		type: 'video',
		name: '视频脚本',
		description: '高度口语化，适合视频旁白和字幕',
		icon: 'Video',
		rules: {
			maxParagraphLength: 80,
			style: 'casual',
			averageSentenceLength: 10,
			aiTasteTarget: 20,
			voice: '口语化'
		}
	},
	{
		type: 'general',
		name: '通用写作',
		description: '标准文章格式，适合博客、专栏等',
		icon: 'FileText',
		rules: {
			maxParagraphLength: 300,
			style: 'formal',
			averageSentenceLength: 20,
			aiTasteTarget: 30
		}
	}
];

export function getStepConfig(step: WorkflowStep): WorkflowStepConfig {
	return workflowSteps[step] || workflowSteps[0];
}

export function getWorkspaceConfig(type: Workspace): WorkspaceConfig {
	return workspaceConfigs.find((w) => w.type === type) || workspaceConfigs[2];
}

export function getNextStep(currentStep: WorkflowStep): WorkflowStep {
	if (currentStep < 11) {
		return (currentStep + 1) as WorkflowStep;
	}
	return currentStep;
}

export function getPrevStep(currentStep: WorkflowStep): WorkflowStep {
	if (currentStep > 0) {
		return (currentStep - 1) as WorkflowStep;
	}
	return currentStep;
}
