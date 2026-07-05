export const DEFAULT_TOPIC_PAGE_SIZE = 20;
export const DEFAULT_COMMENT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export function parsePaginationQuery(
  query: Record<string, unknown>,
  defaultLimit: number
): { page: number; limit: number; search?: string } {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  const rawLimit = parseInt(String(query.limit ?? String(defaultLimit)), 10);
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number.isFinite(rawLimit) ? rawLimit : defaultLimit)
  );
  const search =
    typeof query.search === 'string' && query.search.trim()
      ? query.search.trim()
      : typeof query.q === 'string' && query.q.trim()
        ? query.q.trim()
        : undefined;

  return { page, limit, search };
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  return {
    page,
    limit,
    total,
    hasMore: page * limit < total,
  };
}
