export interface Project {
  _id: string;
  title: string;
  workspace: 'wechat' | 'video' | 'general';
  currentStep: number;
  wordCount: number;
  targetWordCount: number;
  aiTasteScore: number;
  status: 'draft' | 'in_progress' | 'reviewing' | 'published';
  createdAt: string;
  updatedAt: string;
  breakpoints: {
    specification: boolean;
    draft: boolean;
  };
}

export interface ProjectContent {
  _id: string;
  projectId: string;
  step: number;
  contentType: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Topic {
  _id: string;
  projectId: string;
  title: string;
  description: string;
  tags: string[];
  priority: number;
  status: 'pending' | 'selected' | 'rejected';
  evaluation: {
    trendScore: number;
    competitionScore: number;
    audienceScore: number;
    overallScore: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ResearchMaterial {
  _id: string;
  projectId: string;
  sourceType: 'web' | 'file' | 'image' | 'text';
  sourceUrl: string;
  title: string;
  content: string;
  summary: string;
  keywords: string[];
  citation: string;
  createdAt: string;
}

export interface OutlineNode {
  id: string | number;
  title: string;
  content?: string;
  type?: 'section' | 'heading' | 'paragraph';
  children?: OutlineNode[];
}

export interface Outline {
  _id: string;
  projectId: string;
  title: string;
  nodes: OutlineNode[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface HotNewsItem {
  rank: number;
  title: string;
  url: string;
  hotValue: number;
  source: 'weibo' | 'zhihu' | 'bilibili' | 'toutiao';
  category: string;
  excerpt?: string;
  cover?: string;
  author?: string;
  timestamp: string;
}

export interface HotNewsResult {
  sources: Record<string, HotNewsItem[]>;
  merged: HotNewsItem[];
  byCategory: Record<string, HotNewsItem[]>;
  trendingKeywords: { keyword: string; count: number }[];
  timestamp: string;
}

export interface AITasteAnalysis {
  score: number;
  connectorRatio: number;
  clicheRatio: number;
  sentenceStdDev: number;
  sentenceLengths: number[];
  clichesFound: string[];
  connectorsFound: string[];
}

export interface WorkflowStep {
  id: number;
  name: string;
  description: string;
  icon: string;
  path: string;
  canSave: boolean;
  isBreakpoint: boolean;
}

export interface EditorMode {
  mode: 'wysiwyg' | 'markdown' | 'split';
}

export interface Comment {
  _id: string;
  projectId: string;
  step?: number;
  position?: string;
  selection?: string;
  content: string;
  author: string;
  resolved: boolean;
  replies: CommentReply[];
  createdAt: string;
}

export interface CommentReply {
  content: string;
  author: string;
  createdAt: string;
}

export interface VersionHistory {
  _id: string;
  projectId: string;
  step: number;
  content: string;
  versionNumber: number;
  note: string;
  createdAt: string;
}

export interface Platform {
  id: string;
  name: string;
  icon: string;
  description: string;
  rules: {
    maxParagraphLength?: number;
    style?: string;
    useEmoji?: boolean;
    useHashtags?: boolean;
  };
}

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'zhipu';
  modelName: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
}

export interface AuditFlow {
  id: string;
  name: string;
  description: string;
  steps: {
    id: string;
    name: string;
    required: boolean;
  }[];
}
