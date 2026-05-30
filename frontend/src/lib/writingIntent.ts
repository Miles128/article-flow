/** 写作意图（与 backend/config/writing_intents.yaml 对齐） */

export type WritingIntentId =
  | 'informational'
  | 'insight_commentary'
  | 'literary_essay';

export type WritingIntentOption = {
  id: WritingIntentId;
  label: string;
  description?: string;
};

export const FALLBACK_WRITING_INTENTS: WritingIntentOption[] = [
  {
    id: 'insight_commentary',
    label: '观点评论',
    description: '有论断、证据链与判断句',
  },
  {
    id: 'informational',
    label: '信息科普',
    description: '覆盖要点、结构清晰',
  },
  {
    id: 'literary_essay',
    label: '叙事随笔',
    description: '适度修辞与作者视角',
  },
];

export const FALLBACK_DEFAULT_INTENT: WritingIntentId = 'insight_commentary';

export function normalizeWritingIntentId(
  value: string | null | undefined,
): WritingIntentId {
  if (
    value === 'informational' ||
    value === 'insight_commentary' ||
    value === 'literary_essay'
  ) {
    return value;
  }
  return FALLBACK_DEFAULT_INTENT;
}
