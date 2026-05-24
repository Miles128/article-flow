/** 从 API 错误对象提取用户可读消息 */
export function getApiError(err: unknown, fallback = '操作失败'): string {
  if (err && typeof err === 'object') {
    const e = err as { friendlyMessage?: string; message?: string };
    if (e.friendlyMessage) return e.friendlyMessage;
    if (e.message) return e.message;
  }
  return fallback;
}
