import axios from 'axios';
import type { Project, ProjectContent, Topic, ResearchMaterial, Outline, HotNewsResult, Comment, VersionHistory, Platform, ModelInfo, AuditFlow } from '@/types';

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function convertKeysSnakeToCamel(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(convertKeysSnakeToCamel);
  }
  if (obj !== null && typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      result[snakeToCamel(key)] = convertKeysSnakeToCamel(obj[key]);
    }
    return result;
  }
  return obj;
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => {
    if (response.data) {
      response.data = convertKeysSnakeToCamel(response.data);
    }
    return response;
  },
  (error) => Promise.reject(error)
);

export const projectsApi = {
  getAll: () => api.get<Project[]>('/projects'),
  create: (data: { title: string; workspace?: string; targetWordCount?: number }) =>
    api.post<Project>('/projects', data),
  getById: (id: string) => api.get<Project>(`/projects/${id}`),
  update: (id: string, data: Partial<Project>) =>
    api.patch<Project>(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  getContents: (projectId: string, step?: number) =>
    api.get<ProjectContent[]>(`/projects/${projectId}/contents`, { params: { step } }),
  createContent: (projectId: string, data: { step: number; content: string; contentType?: string }) =>
    api.post<ProjectContent>(`/projects/${projectId}/contents`, data),
  updateContent: (projectId: string, contentId: string, content: string) =>
    api.put<ProjectContent>(`/projects/${projectId}/contents/${contentId}`, { content }),
};

export const topicsApi = {
  getByProject: (projectId: string) => api.get<Topic[]>(`/topics?project_id=${projectId}`),
  create: (data: { projectId: string; title: string; description?: string; tags?: string[]; priority?: number }) =>
    api.post<Topic>('/topics', data),
  getById: (id: string) => api.get<Topic>(`/topics/${id}`),
  update: (id: string, data: Partial<Topic>) => api.patch<Topic>(`/topics/${id}`, data),
  delete: (id: string) => api.delete(`/topics/${id}`),
  evaluate: (id: string) => api.post(`/topics/${id}/evaluate`),
};

export const researchApi = {
  getByProject: (projectId: string) => api.get<ResearchMaterial[]>(`/research?project_id=${projectId}`),
  create: (data: Omit<ResearchMaterial, '_id' | 'createdAt'>) =>
    api.post<ResearchMaterial>('/research', data),
  delete: (id: string) => api.delete(`/research/${id}`),
  fetchUrl: (url: string) => api.post('/research/fetch-url', { url }),
  summarize: (content: string, maxLength?: number) =>
    api.post<{ summary: string }>('/research/summarize', { content, max_length: maxLength }),
  extractKeywords: (content: string, count?: number) =>
    api.post<{ keywords: string[] }>('/research/extract-keywords', { content, count }),
  generateCitation: (data: { sourceType: string; title: string; author?: string; url?: string; publicationDate?: string }) =>
    api.post('/research/generate-citation', data),
};

export const outlineApi = {
  getByProject: (projectId: string) => api.get<Outline>(`/outline?project_id=${projectId}`),
  createOrUpdate: (data: { projectId: string; title: string; nodes: any[] }) =>
    api.post<Outline>('/outline', data),
  generate: (data: { topic: string; targetWordCount?: number; style?: string }) =>
    api.post('/outline/generate', data),
  getTemplates: () => api.get('/outline/templates'),
};

export const writingApi = {
  continue: (content: string, context?: Record<string, unknown>) =>
    api.post<{ continuation: string }>('/writing/continue', { content, context }),
  polish: (content: string, style?: string) =>
    api.post<{ polished_content: string }>('/writing/polish', { content, style }),
  rewrite: (content: string, style: string) =>
    api.post<{ rewritten_content: string }>('/writing/rewrite', { content, style }),
  expand: (content: string, targetLength?: number) =>
    api.post<{ expanded_content: string }>('/writing/expand', { content, target_length: targetLength }),
  shorten: (content: string, targetRatio?: number) =>
    api.post<{ shortened_content: string }>('/writing/shorten', { content, target_ratio: targetRatio }),
  grammarCheck: (content: string) => api.post('/writing/grammar-check', { content }),
  analyzeAITaste: (content: string) => api.post('/writing/ai-taste', { content }),
  generateTitle: (content: string, count?: number, platform?: string) =>
    api.post('/writing/generate-title', { content, count, platform }),
};

export const reviewApi = {
  getComments: (projectId: string) => api.get<Comment[]>(`/review/comments?project_id=${projectId}`),
  createComment: (data: Omit<Comment, '_id' | 'createdAt' | 'resolved' | 'replies'>) =>
    api.post<Comment>('/review/comments', data),
  updateComment: (id: string, data: Partial<Comment>) =>
    api.put<Comment>(`/review/comments/${id}`, data),
  deleteComment: (id: string) => api.delete(`/review/comments/${id}`),
  checkCompliance: (content: string) => api.post('/review/compliance', { content }),
  checkLogic: (content: string) => api.post('/review/logic-check', { content }),
  getAuditFlows: () => api.get<AuditFlow[]>('/review/audit-flow'),
  runAudit: (content: string, flowId: string) =>
    api.post('/review/audit', { content, flow_id: flowId }),
};

export const formatApi = {
  normalizeMarkdown: (content: string) =>
    api.post<{ normalized_content: string }>('/format/normalize', { content }),
  convert: (content: string, targetPlatform: string) =>
    api.post<{ target_platform: string; converted_content: string }>('/format/convert', {
      content,
      target_platform: targetPlatform,
    }),
  getPlatforms: () => api.get<Platform[]>('/format/platforms'),
  export: (content: string, format: string, title?: string) =>
    api.post('/format/export', { content, format, title }),
};

export const hotnewsApi = {
  getAll: (sources?: string[]) => api.get<HotNewsResult>('/hotnews', { params: { source: sources } }),
  getWeibo: () => api.get('/hotnews/weibo'),
  getZhihu: () => api.get('/hotnews/zhihu'),
  getBilibili: () => api.get('/hotnews/bilibili'),
  getToutiao: () => api.get('/hotnews/toutiao'),
  analyzeTrend: (keyword: string) => api.post('/hotnews/trend', { keyword }),
  getSources: () => api.get('/hotnews/sources'),
  getCategories: () => api.get('/hotnews/categories'),
  mineTopics: (keywords: string[], count?: number) =>
    api.post('/hotnews/mine-topics', { keywords, count }),
};

export const aiApi = {
  chat: (messages: { role: string; content: string }[], provider?: string, modelName?: string) =>
    api.post<{ response: string; provider: string; model: string }>('/ai/chat', {
      messages,
      provider,
      model_name: modelName,
    }),
  getModels: () => api.get<Record<string, ModelInfo[]>>('/ai/models'),
  generate: (prompt: string, systemPrompt?: string, provider?: string, modelName?: string) =>
    api.post<{ response: string }>('/ai/generate', {
      prompt,
      system_prompt: systemPrompt,
      provider,
      model_name: modelName,
    }),
  getConfig: () => api.get('/ai/config'),
  testConnection: (provider: string, apiKey: string) =>
    api.post('/ai/test', { provider, api_key: apiKey }),
};

export default api;
