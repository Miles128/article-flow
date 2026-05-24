export interface Project {
  _id: string;
  title: string;
  workspace: 'wechat' | 'video' | 'general';
  contentType?: 'script' | 'article' | 'general';
  currentStep: number;
  wordCount: number;
  targetWordCount: number;
  aiTasteScore: number;
  status: 'draft' | 'in_progress' | 'reviewing' | 'published';
  createdAt: string;
  updatedAt: string;
  styleProfileId?: string | null;
  selectedTitle?: string;
  coverLine?: string;
  workflowVersion?: number;
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
  sectionType?: 'info' | 'experience';
  children?: OutlineNode[];
}

export interface Claim {
  _id: string;
  projectId: string;
  text: string;
  materialId?: string;
  sourceQuote?: string;
  verified: boolean;
  createdAt: string;
}

export interface AntiAiScanResult {
  score: number;
  targetScore: number;
  passed: boolean;
  matchCount: number;
  matches: Array<{
    text: string;
    category: string;
    start: number;
    end: number;
    suggestion: string;
  }>;
  dimensions: Record<string, number>;
  gateStatus?: string;
}

export interface ContentEvalResult {
  totalScore: number;
  passed: boolean;
  dimensions: Record<string, number>;
  aiFlavorScore: number;
  aiFlavorBand: string;
  suggestions: string[];
  rewriteRequired?: boolean;
}

export interface CriticResult {
  score: number;
  passed: boolean;
  feedback: string;
  breakdown: Record<string, number>;
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
  title: string;
  url: string;
  content?: string;
  hotValue: number;
  source: 'baidu' | 'bing' | 'duckduckgo' | 'tavily';
  category: string;
}

export interface HotNewsCategory {
  name: string;
  icon: string;
  description: string;
}

export interface HotNewsSearchResult {
  category?: string;
  query?: string;
  engineQuery?: string;
  searchLanguage?: string;
  items: HotNewsItem[];
  timestamp: string;
  error?: string;
  warnings?: string[];
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
  baseUrl: string;
  modelName: string;
  temperature: number;
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
