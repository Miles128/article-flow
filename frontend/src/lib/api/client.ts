import axios from 'axios';
import type { Project, ProjectContent, Topic, ResearchMaterial, Outline, HotNewsSearchResult, Comment, Claim, AntiAiScanResult, ContentEvalResult, CriticResult } from '@/types';

// ===== 键名转换工具 =====

function snakeToCamel(str: string): string {
  if (str.startsWith('_')) return str;
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function camelToSnake(str: string): string {
  if (str.startsWith('_')) return str;
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
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

export function convertKeysCamelToSnake(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(convertKeysCamelToSnake);
  }
  if (obj !== null && typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      result[camelToSnake(key)] = convertKeysCamelToSnake(obj[key]);
    }
    return result;
  }
  return obj;
}

// ===== API 客户端 =====

function resolveApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api`;
  }
  return 'http://127.0.0.1:5001/api';
}

/** SSE 必须直连 Flask；经 Next 代理会被缓冲成一次性响应 */
export function resolveStreamingApiBaseUrl(): string {
  const base = resolveApiBaseUrl();
  if (typeof window === 'undefined') {
    return base;
  }
  try {
    const resolved = new URL(base, window.location.origin);
    if (resolved.origin === window.location.origin) {
      return 'http://127.0.0.1:5001/api';
    }
  } catch {
    /* keep base */
  }
  return base;
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器：自动 camelCase → snake_case
api.interceptors.request.use(
  (config) => {
    if (config.data && typeof config.data === 'object') {
      config.data = convertKeysCamelToSnake(config.data);
    }
    if (config.params && typeof config.params === 'object') {
      config.params = convertKeysCamelToSnake(config.params);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器：自动 snake_case → camelCase + 错误处理
api.interceptors.response.use(
  (response) => {
    if (response.data) {
      response.data = convertKeysSnakeToCamel(response.data);
    }
    return response;
  },
  (error) => {
    const backendMsg = error?.response?.data?.error || error?.response?.data?.message || '';
    const msgStr = typeof backendMsg === 'string' ? backendMsg : JSON.stringify(backendMsg);
    const lower = msgStr.toLowerCase();

    if (backendMsg && typeof backendMsg === 'string' && !lower.includes('error') && !lower.includes('exception') && !lower.includes('traceback') && !lower.includes('status') && !/\d{3}/.test(backendMsg)) {
      error.friendlyMessage = backendMsg;
      return Promise.reject(error);
    }

    let friendly = '';
    if (lower.includes('欠费') || lower.includes('arrearage') || lower.includes('overdue')) {
      friendly = 'API 账号欠费，请充值后重试';
    } else if (lower.includes('invalid_api_key') || lower.includes('invalid api key') || lower.includes('incorrect api key')) {
      friendly = 'API Key 无效，请检查设置';
    } else if (lower.includes('authentication') && (lower.includes('denied') || lower.includes('failed'))) {
      friendly = 'API Key 无效，请检查设置';
    } else if (lower.includes('rate_limit') || lower.includes('rate limit') || lower.includes('too many requests') || error?.response?.status === 429) {
      friendly = '请求过于频繁，请稍后重试';
    } else if (lower.includes('quota') || lower.includes('billing') || lower.includes('insufficient')) {
      friendly = 'API 额度不足，请充值或更换 Key';
    } else if (lower.includes('model_not_found') || lower.includes('model not found') || lower.includes('does not exist')) {
      friendly = '模型不存在，请检查模型名称';
    } else if (lower.includes('context_length') || lower.includes('too many tokens')) {
      friendly = '内容过长，超出模型处理限制';
    } else if (lower.includes('请先配置') || (lower.includes('api key') && (lower.includes('required') || lower.includes('not set')))) {
      friendly = msgStr;
    } else if (lower.includes('网络连接失败') || lower.includes('网络')) {
      friendly = msgStr;
    } else if (lower.includes('unsupported_country') || lower.includes('llm_base_url') || lower.includes('proxy')) {
      friendly = msgStr;
    } else if (error?.code === 'ECONNABORTED' || lower.includes('timeout')) {
      friendly = '请求超时，按大纲写稿可能需要数分钟，请稍后重试';
    } else if (!error?.response && (error?.message?.toLowerCase().includes('network error') || error?.code === 'ERR_NETWORK')) {
      friendly = '无法连接后端，请确认已运行 ./start.sh 或 start-tauri.sh';
    } else if (error?.response?.status === 404) {
      friendly = '请求的资源不存在';
    } else if (error?.response?.status === 500) {
      friendly = msgStr || '服务器内部错误，请稍后重试';
    } else if (error?.response?.status === 400) {
      friendly = msgStr || '请求参数错误';
    }

    if (friendly) {
      error.friendlyMessage = friendly;
    }

    return Promise.reject(error);
  }
);

// ===== API 方法 =====
// 所有请求参数使用 camelCase，拦截器自动转换

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
  downloadExportZip: async (projectId: string, filename?: string, force?: boolean) => {
    const res = await api.get(`/projects/${projectId}/export`, {
      responseType: 'blob',
      params: force ? { force: '1' } : undefined,
      validateStatus: (s) => s === 200 || s === 403,
    });
    if (res.status === 403) {
      const text = await (res.data as Blob).text();
      let msg = '发布门禁未通过';
      try {
        const parsed = JSON.parse(text);
        msg = parsed.error || parsed.gate?.message || msg;
      } catch {
        /* ignore */
      }
      throw Object.assign(new Error(msg), { friendlyMessage: msg, gateBlocked: true });
    }
    const blob = new Blob([res.data], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `${projectId}-article-flow-export.zip`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

export const topicsApi = {
  getByProject: (projectId: string) => api.get<Topic[]>(`/topics`, { params: { projectId } }),
  create: (data: { projectId: string; title: string; description?: string; tags?: string[]; priority?: number }) =>
    api.post<Topic>('/topics', data),
  update: (id: string, data: Partial<Topic>) => api.patch<Topic>(`/topics/${id}`, data),
  delete: (id: string) => api.delete(`/topics/${id}`),
  evaluate: (id: string) => api.post(`/topics/${id}/evaluate`, {}),
};

export const researchApi = {
  getByProject: (projectId: string) => api.get<ResearchMaterial[]>(`/research`, { params: { projectId } }),
  create: (data: Omit<ResearchMaterial, '_id' | 'createdAt'>) =>
    api.post<ResearchMaterial>('/research', data),
  delete: (id: string) => api.delete(`/research/${id}`),
  fetchUrl: (url: string) => api.post('/research/fetch-url', { url }),
  summarize: (content: string, maxLength?: number) =>
    api.post<{ summary: string }>('/research/summarize', { content, maxLength }),
  getClaims: (projectId: string) => api.get<Claim[]>(`/research/claims`, { params: { projectId } }),
  createClaim: (data: { projectId: string; text: string; materialId?: string; sourceQuote?: string }) =>
    api.post<Claim>('/research/claims', data),
  verifyClaims: (projectId: string, content: string) =>
    api.post('/research/claims/verify', { projectId, content }),
  getResearchPackage: (projectId: string) =>
    api.get<{ materials: ResearchMaterial[]; claims: Claim[] }>(`/research/research-package`, { params: { projectId } }),
};

export const outlineApi = {
  getByProject: (projectId: string) => api.get<Outline>(`/outline`, { params: { projectId } }),
  createOrUpdate: (data: { projectId: string; title: string; nodes: any[] }) =>
    api.post<Outline>('/outline', data),
  generate: (data: { topic: string; targetWordCount?: number; style?: string }) =>
    api.post('/outline/generate', data, { timeout: 120000 }),
  getTemplates: () => api.get('/outline/templates'),
};

export const writingApi = {
  getModes: () => api.get('/writing/modes'),
  getStyles: () =>
    api.get<{
      default: string;
      intensity?: { default: number; min: number; max: number };
      styles: Array<{
        id: string;
        label: string;
        description?: string;
        default_intensity?: number;
        max_intensity?: number;
      }>;
    }>('/writing/styles'),
  scanAiRules: (content: string) => api.post<AntiAiScanResult>('/writing/scan-ai-rules', { content }),
  fixAiRules: (content: string, opts?: { useLlmPolish?: boolean; styleProfileId?: string }) =>
    api.post<{ fixedContent: string; beforeScore: number; afterScore: number; improved: boolean }>('/writing/fix-ai-rules', {
      content,
      useLlmPolish: opts?.useLlmPolish,
      styleProfileId: opts?.styleProfileId,
    }),
  coachGuide: (sectionInfo: Record<string, unknown>, opts?: { styleProfileId?: string }) =>
    api.post<{ guide: string }>('/writing/coach-guide', { sectionInfo, styleProfileId: opts?.styleProfileId }),
  coachCheck: (content: string, sectionInfo: Record<string, unknown>) =>
    api.post<{ feedback: string; ruleScan?: AntiAiScanResult }>('/writing/coach-check', { content, sectionInfo }),
  frameworkGenerate: (opts: {
    outline?: string;
    projectId?: string;
    context?: Record<string, unknown>;
    styleProfileId?: string;
  }) =>
    api.post<{ content: string; missingSections?: string[]; outlineFollowing?: boolean }>(
      '/writing/framework-generate',
      {
        outline: opts.outline,
        projectId: opts.projectId,
        context: opts.context,
        styleProfileId: opts.styleProfileId,
      },
      { timeout: 600000 },
    ),
  fastDraft: (data: { projectId: string; nodes?: unknown[]; outline?: string; style?: string; styleProfileId?: string; targetWordCount?: number }) =>
    api.post<{
      content: string;
      sectionCount: number;
      missingSections?: string[];
      outlineFollowing?: boolean;
      totalWordCount?: number;
      targetTotalWords?: number;
      sectionWordTargets?: Array<{ title: string; targetWordCount: number; actualWordCount: number }>;
      agentsUsed?: string[];
    }>(
      '/writing/fast-draft',
      data,
      { timeout: 600000 },
    ),
  getSectionDraft: (projectId: string) =>
    api.get<{
      sections: Array<{ id: string | number; title: string; sectionType: string; level: number }>;
      section_count?: number;
    }>('/writing/section-draft', { params: { projectId } }),
  generateSection: (data: {
    sectionTitle: string;
    sectionType?: string;
    sectionBrief?: string;
    sectionContent?: string;
    projectId?: string;
    context?: Record<string, unknown>;
    styleProfileId?: string;
  }) => api.post<{ content: string; ruleScan: AntiAiScanResult }>('/writing/generate-section', data),
  judgeSection: (content: string, sectionTitle: string) =>
    api.post('/writing/judge-section', { content, sectionTitle }),
  reviseSection: (data: {
    content: string;
    sectionTitle: string;
    issues?: string[];
    previousScore?: number;
    projectId?: string;
    styleProfileId?: string;
  }) => api.post<{ content: string; revised: boolean; degraded: boolean }>('/writing/revise-section', data),
  continue: (content: string, context?: Record<string, unknown>, styleProfileId?: string) =>
    api.post<{ continuation: string }>('/writing/continue', { content, context, styleProfileId, antiAiRules: true }, { timeout: 120000 }),
  polish: (content: string, style?: string, styleProfileId?: string) =>
    api.post<{ polishedContent: string }>('/writing/polish', { content, style, styleProfileId, antiAiRules: true }, { timeout: 120000 }),
  rewrite: (content: string, style: string, styleProfileId?: string) =>
    api.post<{ rewrittenContent: string }>(
      '/writing/rewrite',
      { content, style, styleProfileId, antiAiRules: true },
      { timeout: 120000 },
    ),
  expand: (content: string, targetLength?: number, styleProfileId?: string) =>
    api.post<{ expandedContent: string }>('/writing/expand', { content, targetLength, styleProfileId, antiAiRules: true }, { timeout: 120000 }),
  shorten: (content: string, opts?: { targetRatio?: number; targetWordCount?: number; sourceWordCount?: number; styleProfileId?: string }) =>
    api.post<{ shortenedContent: string; sourceWordCount?: number; targetWordCount?: number }>(
      '/writing/shorten',
      { content, ...opts, antiAiRules: true },
      { timeout: 120000 }
    ),
  applyPrompt: (content: string, instruction: string, styleProfileId?: string) =>
    api.post<{ content: string }>(
      '/writing/apply-prompt',
      { content, instruction, styleProfileId, antiAiRules: true },
      { timeout: 120000 }
    ),
  analyzeAITaste: (content: string) =>
    api.post('/writing/ai-taste', { content }, { timeout: 120000 }),
  titleWorkshop: (data: {
    topic: string;
    outline?: string;
    draftExcerpt?: string;
    count?: number;
    platform?: string;
    styleProfileId?: string;
  }) => api.post('/writing/title-workshop', data),
  deriveVariants: (data: { projectId?: string; content?: string; persist?: boolean }) =>
    api.post<{ variants: Record<string, string>; platforms: string[] }>('/writing/derive-variants', data),
  humanize: (data: { projectId?: string; content?: string; persist?: boolean }) =>
    api.post<{ content: string; beforeScore: number; afterScore: number; improved: boolean; gateStatus: string }>(
      '/writing/humanize',
      data
    ),
  listVersions: (projectId: string, step?: number) =>
    api.get<{ versions: Array<{ _id: string; versionNumber: number; note: string; createdAt: string; wordCount: number; preview: string }> }>(
      '/writing/versions',
      { params: { projectId, step } },
    ),
  getVersion: (versionId: string) =>
    api.get<{ _id: string; content: string; versionNumber: number; note: string; createdAt: string }>(
      `/writing/versions/${versionId}`,
    ),
  snapshotDraft: (data: { projectId: string; content: string; note?: string; step?: number }) =>
    api.post('/writing/versions/snapshot', data),
  restoreVersion: (data: { projectId: string; versionId: string; currentContent?: string }) =>
    api.post<{ content: string; contentId: string; versionNumber: number }>('/writing/versions/restore', data),
};

export const contentApi = {
  getFrameworks: () => api.get<{ frameworks: Array<{ id: string; name: string; best_for: string[]; sections: Array<{ title: string; hint: string }> }> }>('/content/frameworks'),
  eval: (content: string, title?: string) => api.post('/content/eval', { content, title }),
  gateCheck: (data: { content?: string; projectId?: string }) => api.post('/content/gate-check', data),
  savePublishBundle: (data: {
    projectId: string;
    title?: string;
    hook?: string;
    digest?: string;
    coverLine?: string;
    closingQuestion?: string;
    imageBriefs?: string[];
  }) => api.post('/content/publish-bundle', data),
  learnPlaybook: (data: { before: string; after: string; projectId?: string; styleProfileId?: string }) =>
    api.post('/content/playbook/learn', data),
  getPlaybookLearnings: () => api.get('/content/playbook/learnings'),
};

export const reviewApi = {
  getReviewPasses: () => api.get('/review/review-passes'),
  runReviewPass: (content: string, passType: string, context?: Record<string, unknown>) =>
    api.post('/review/review-pass', { content, passType, context }),
  runReviewAll: (content: string) =>
    api.post('/review/review-all', { content }),
  runReviewPipeline: (content: string, context?: Record<string, unknown>) =>
    api.post<{
      results: Record<string, unknown>;
      ruleScan: AntiAiScanResult;
      eval: ContentEvalResult;
      critic: CriticResult;
      reportMarkdown: string;
      passed: boolean;
    }>('/review/review-pipeline', { content, context }),
  checkAuthenticity: (content: string) =>
    api.post('/review/authenticity', { content }),
  getComments: (projectId: string) => api.get<Comment[]>(`/review/comments`, { params: { projectId } }),
  createComment: (data: Omit<Comment, '_id' | 'createdAt' | 'resolved' | 'replies'>) =>
    api.post<Comment>('/review/comments', data),
  updateComment: (id: string, data: Partial<Comment>) =>
    api.put<Comment>(`/review/comments/${id}`, data),
  deleteComment: (id: string) => api.delete(`/review/comments/${id}`),
};

export const hotnewsApi = {
  search: (params: { query: string; maxResults?: number }) =>
    api.get<HotNewsSearchResult>('/hotnews/search', { params, timeout: 90000 }),
  mineTopics: (data: {
    query: string;
    count?: number;
  }) =>
    api.post('/hotnews/mine-topics', data),
  generateSearchLinks: (data: { keywords: string[] }) =>
    api.post('/hotnews/generate-search-links', data),
};

export const styleApi = {
  list: () => api.get('/style/'),
  analyze: (texts: string[]) => api.post<{ styleData: any; stylePrompt: string }>('/style/analyze', { texts }),
  create: (name: string, texts: string[]) => api.post('/style/', { name, texts }),
  delete: (id: string) => api.delete(`/style/${id}`),
  getPrompt: (id: string) => api.get(`/style/${id}/prompt`),
};

export const statsApi = {
  getProjectStats: (projectId: string) => api.get(`/projects/${projectId}/stats`),
};

export const writingStreamApi = {
  /** 统一写作 AI 流式（续写/润色/风格转换/扩写/缩写/智能改写/按大纲生成等） */
  aiStream: (body: Record<string, unknown>) => {
    const apiBase = resolveStreamingApiBaseUrl();
    return fetch(`${apiBase}/writing/ai-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(convertKeysCamelToSnake(body)),
    });
  },
  /** SSE 流式快写：返回 ReadableStream，用 fetch + getReader 消费 */
  fastDraftStream: (data: {
    projectId: string;
    style?: string;
    styleIntensity?: number;
    styleProfileId?: string;
    targetWordCount?: number;
  }): Promise<Response> => {
    const apiBase = resolveStreamingApiBaseUrl();
    const url = `${apiBase}/writing/fast-draft-stream`;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify(convertKeysCamelToSnake(data)),
    }).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      if (/failed to fetch|networkerror|load failed/i.test(msg)) {
        throw new Error(
          `无法连接写作服务（${url}）。请确认已运行 ./start.sh 并重启后端。`,
        );
      }
      throw err;
    });
  },
};

export const formatApi = {
  getPlatforms: () => api.get('/format/platforms'),
  exportMarkdown: (data: { content: string; format: string; title?: string }) =>
    api.post('/format/export', data, { responseType: 'blob' }),
  exportJson: (data: { content: string; format: string; title?: string }) =>
    api.post('/format/export', data),
};

export default api;
