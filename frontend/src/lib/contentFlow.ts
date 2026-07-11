import { projectsApi, outlineApi, topicsApi, researchApi } from '@/lib/api/client';
import { openFile } from '@/lib/platform';

const DRAFT_STEP = 5;

export { DRAFT_STEP };

/** 按大纲写稿的节数 = 顶层章节数（不含子要点节点） */
export function countFastDraftSections(
  sections: Array<{ level?: number }> | undefined,
): number {
  const list = sections ?? [];
  const topLevel = list.filter((s) => (s.level ?? 0) === 0);
  return topLevel.length > 0 ? topLevel.length : list.length;
}

function outlineToMarkdown(nodes: { title?: string; content?: string; children?: unknown[] }[], level = 0): string {
  if (!nodes?.length) return '';
  const prefix = '#'.repeat(Math.min(level + 2, 6));
  return nodes
    .map((node) => {
      let md = `${prefix} ${node.title || ''}`;
      if (node.content) md += `\n${node.content}`;
      if (node.children?.length) md += '\n' + outlineToMarkdown(node.children as typeof nodes, level + 1);
      return md;
    })
    .join('\n\n');
}

export async function getProjectOutlineMarkdown(projectId: string): Promise<string> {
  try {
    const resp = await outlineApi.getByProject(projectId);
    const outline = resp.data;
    if (!outline?.nodes?.length) return '';
    const body = outlineToMarkdown(outline.nodes);
    if (outline.title?.trim()) {
      return `# ${outline.title.trim()}\n\n${body}`.trim();
    }
    return body.trim();
  } catch (err) {
    console.error('getProjectOutlineMarkdown failed:', err);
    return '';
  }
}

async function loadSavedAtStep(projectId: string, step: number) {
  try {
    const response = await projectsApi.getContents(projectId, step);
    if (response.data.length > 0) {
      const latest = response.data.reduce((best, item) => {
        const bestTs = best.updatedAt || best.createdAt || '';
        const itemTs = item.updatedAt || item.createdAt || '';
        return itemTs >= bestTs ? item : best;
      });
      if (latest.content?.trim()) {
        return { content: latest.content, contentId: latest._id as string };
      }
    }
  } catch (err) {
    console.error('loadSavedAtStep failed:', err);
  }
  return { content: '', contentId: null as string | null };
}

export async function getDraftContent(projectId: string): Promise<string> {
  return (await loadSavedAtStep(projectId, DRAFT_STEP)).content;
}

export async function saveDraftContent(
  projectId: string,
  text: string,
  contentId: string | null
): Promise<string> {
  const body = text.trim();
  if (!body) throw new Error('content is empty');
  if (contentId) {
    await projectsApi.updateContent(projectId, contentId, body);
    return contentId;
  }
  const resp = await projectsApi.createContent(projectId, {
    step: DRAFT_STEP,
    content: body,
    contentType: 'markdown',
  });
  return resp.data._id;
}

async function buildWritingContext(projectId: string): Promise<string> {
  const parts: string[] = [];

  try {
    const topicsResp = await topicsApi.getByProject(projectId);
    const selected = (topicsResp.data || []).find((t) => t.status === 'selected');
    if (selected) {
      let topicInfo = `## 选定选题\n\n**${selected.title}**`;
      if (selected.description) topicInfo += `\n\n${selected.description}`;
      parts.push(topicInfo);
    }
  } catch {
    /* ignore */
  }

  try {
    const outlineResp = await outlineApi.getByProject(projectId);
    if (outlineResp.data?.nodes?.length) {
      const outlineMd = outlineToMarkdown(outlineResp.data.nodes);
      if (outlineMd.trim()) parts.push(`## 文章大纲\n\n${outlineMd}`);
    }
  } catch {
    /* ignore */
  }

  try {
    const materials = (await researchApi.getByProject(projectId)).data || [];
    if (materials.length > 0) {
      const researchMd = materials
        .map((m, i) => {
          let part = `### 资料${i + 1}: ${m.title || '无标题'}`;
          if (m.summary) part += `\n\n摘要: ${m.summary}`;
          else if (m.content) part += `\n\n${m.content.slice(0, 500)}${m.content.length > 500 ? '...' : ''}`;
          return part;
        })
        .join('\n\n');
      parts.push(`## 参考资料\n\n${researchMd}`);
    }
  } catch {
    /* ignore */
  }

  return parts.join('\n\n---\n\n');
}

export async function getPreviousStepContent(projectId: string, currentStep: number): Promise<string> {
  if (currentStep === DRAFT_STEP) {
    const saved = await getDraftContent(projectId);
    if (saved) return saved;
    return buildWritingContext(projectId);
  }

  if (currentStep >= 6) {
    const draft = await getDraftContent(projectId);
    if (draft) return draft;
    return (await loadSavedAtStep(projectId, currentStep)).content;
  }

  if (currentStep === 4) {
    const topic = await getSelectedTopic(projectId);
    if (topic) return `选题: ${topic.title}\n${topic.description || ''}`;
  }

  return '';
}

export async function importContentFromFile(): Promise<string | null> {
  try {
    return (await openFile(['md', 'txt'])).content;
  } catch {
    return null;
  }
}

export type DraftLoadResult = {
  content: string;
  contentId: string | null;
  source: 'saved' | 'previous' | 'none';
};

export async function loadDraftForStep(
  projectId: string,
  fallbackStep: number,
  storageStep: number = DRAFT_STEP
): Promise<DraftLoadResult> {
  const saved = await loadSavedAtStep(projectId, storageStep);
  if (saved.content) {
    return { ...saved, source: 'saved' };
  }

  const previousContent = await getPreviousStepContent(projectId, fallbackStep);
  if (previousContent.trim()) {
    return { content: previousContent, contentId: null, source: 'previous' };
  }

  return { content: '', contentId: null, source: 'none' };
}

export async function getSelectedTopic(
  projectId: string
): Promise<{ title: string; description?: string } | null> {
  try {
    const topics = (await topicsApi.getByProject(projectId)).data || [];
    const selected = topics.find((t) => t.status === 'selected');
    const pick = selected || topics[0];
    if (pick) return { title: pick.title, description: pick.description };
  } catch {
    /* ignore */
  }
  return null;
}
