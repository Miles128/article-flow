/** 从 API 错误对象提取用户可读消息 */
export function getApiError(err: unknown, fallback = '操作失败'): string {
  if (err && typeof err === 'object') {
    const e = err as {
      friendlyMessage?: string;
      message?: string;
      response?: { data?: { error?: string; message?: string } };
    };
    if (e.friendlyMessage) return e.friendlyMessage;
    const backend =
      e.response?.data?.error || e.response?.data?.message;
    if (typeof backend === 'string' && backend.trim()) return backend;
    if (e.message && !e.message.startsWith('Request failed with status code')) {
      return e.message;
    }
  }
  return fallback;
}
