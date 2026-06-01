import {
  convertKeysCamelToSnake,
  resolveStreamingApiBaseUrl,
} from '@/lib/api/client';

export type RewriteStreamStats = {
  selective?: boolean;
  unit_count?: number;
  planned_count?: number;
  rewritten_count?: number;
  target_pct?: number;
  cover_ratio?: number;
};

export type WritingStreamEvent = {
  type: string;
  action?: string;
  text?: string;
  content?: string;
  message?: string;
  continuation?: string;
  missing_sections?: string[];
  rewrite_stats?: RewriteStreamStats;
};

/** 解析 SSE（data: {...}\\n\\n） */
export async function consumeWritingSse(
  response: Response,
  onEvent: (event: WritingStreamEvent) => void,
): Promise<void> {
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const msg =
      (errData as { error?: string }).error || `HTTP ${response.status}`;
    throw new Error(msg);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('浏览器不支持流式读取');

  const decoder = new TextDecoder();
  let buffer = '';

  const dispatch = (raw: string) => {
    const dataLine = raw
      .split('\n')
      .find((line) => line.startsWith('data: '));
    if (!dataLine) return;
    try {
      onEvent(JSON.parse(dataLine.slice(6)) as WritingStreamEvent);
    } catch {
      /* skip malformed */
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() || '';
    for (const chunk of chunks) dispatch(chunk);
  }
  if (buffer.trim()) dispatch(buffer);
}

export async function postWritingAiStream(
  body: Record<string, unknown>,
): Promise<Response> {
  const apiBase = resolveStreamingApiBaseUrl();
  const url = `${apiBase}/writing/ai-stream`;
  try {
    return await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(convertKeysCamelToSnake(body)),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/failed to fetch|networkerror|load failed/i.test(msg)) {
      throw new Error(
        `无法连接写作服务（${url}）。请确认已运行 ./start.sh，且后端已重启到最新代码。`,
      );
    }
    throw err;
  }
}

export type StreamWritingAiOptions = {
  onDelta?: (content: string, event: WritingStreamEvent) => void;
  onStart?: (event: WritingStreamEvent) => void;
  /** 收到 start 或首个 delta 时调用一次（用于关闭配置弹窗） */
  onStreamStart?: () => void;
};

/** 流式调用写作 AI，返回最终 content */
export async function streamWritingAi(
  body: Record<string, unknown>,
  opts: StreamWritingAiOptions = {},
): Promise<string> {
  const response = await postWritingAiStream(body);
  let finalContent = '';
  let streamStarted = false;
  const markStreamStarted = () => {
    if (streamStarted) return;
    streamStarted = true;
    opts.onStreamStart?.();
  };

  await consumeWritingSse(response, (event) => {
    if (event.type === 'start') {
      markStreamStarted();
      opts.onStart?.(event);
      return;
    }
    if (event.type === 'delta' && event.content != null) {
      markStreamStarted();
      finalContent = event.content;
      opts.onDelta?.(event.content, event);
      return;
    }
    if (event.type === 'done') {
      if (event.content != null) {
        finalContent = event.content;
        opts.onDelta?.(event.content, event);
      }
      return;
    }
    if (event.type === 'error') {
      throw new Error(event.message || '生成出错');
    }
  });

  return finalContent;
}
