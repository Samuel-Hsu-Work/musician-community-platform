const MAX_TITLE_WORDS = 15;

/** Strip markdown / label noise from AI-generated daily discussion titles. */
export function cleanDailyDiscussionTitle(raw: string): string {
  let title = raw.trim();

  title = title.replace(/^#+\s*/, '');
  title = title.replace(/^title:\s*/i, '');
  title = title.replace(/^\*\*(.+)\*\*$/, '$1');
  title = title.replace(/^["'](.+)["']$/, '$1');
  title = title.replace(/\s+/g, ' ').trim();

  const words = title.split(' ').filter(Boolean);
  if (words.length > MAX_TITLE_WORDS) {
    title = words.slice(0, MAX_TITLE_WORDS).join(' ');
  }

  return title;
}

/** First non-empty line = title; remainder = body. */
export function parseAiDailyDiscussionResponse(raw: string): {
  title: string;
  content: string;
} {
  const trimmed = raw.trim();
  const lines = trimmed.split('\n');
  const titleLineIndex = lines.findIndex((line) => line.trim().length > 0);
  const titleLine =
    titleLineIndex >= 0 ? lines[titleLineIndex].trim() : 'Music Theory Discussion';

  const content = lines
    .slice(titleLineIndex + 1)
    .join('\n')
    .trim();

  return {
    title: cleanDailyDiscussionTitle(titleLine),
    content:
      content ||
      'Share your thoughts and experiences about this music theory topic.',
  };
}
