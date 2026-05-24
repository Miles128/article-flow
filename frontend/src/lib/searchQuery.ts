/** Build a web search query from a topic — always the full title, never tags/keywords. */
export function buildTopicSearchQuery(topic: {
  title: string;
  description?: string;
}): string {
  const title = topic.title?.trim() || '';
  const description = topic.description?.trim() || '';
  if (title && description) {
    return `${title} ${description}`.trim();
  }
  return title;
}
