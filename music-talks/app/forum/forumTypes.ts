export type ForumMode = "discussion" | "community";
export type CommunityFilter = "all" | "mine";

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

export interface Topic {
  id: string;
  date: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  type?: string;
  authorUsername?: string | null;
  userId?: string | null;
  likeCount?: number;
  likedByUser?: boolean;
}

export interface Comment {
  id: string;
  topicId: string;
  userId?: string | null;
  username: string;
  text: string;
  parentId?: string | null;
  createdAt: string;
  updatedAt: string;
  likeCount?: number;
  likedByUser?: boolean;
  replies?: Comment[];
}

export const FORUM_TABS: { id: ForumMode; label: string }[] = [
  { id: "discussion", label: "Discussion" },
  { id: "community", label: "Community" },
];

export function topicMatchesForumMode(topic: Topic, mode: ForumMode): boolean {
  if (mode === "discussion") {
    return topic.type === "daily_discussion";
  }
  return topic.type === "community_post";
}

export function forumModeFromSearchParams(
  searchParams: Pick<URLSearchParams, "get">
): ForumMode {
  const mode = searchParams.get("mode");
  return mode === "community" ? "community" : "discussion";
}

export function isEdited(createdAt: string, updatedAt: string): boolean {
  return (
    new Date(updatedAt).getTime() - new Date(createdAt).getTime() > 1000
  );
}

export function buildForumTopicUrl(
  topicId: string,
  mode: ForumMode,
  filter: CommunityFilter = "all"
): string {
  const params = new URLSearchParams({ mode, topic: topicId });
  if (mode === "community" && filter === "mine") {
    params.set("filter", "mine");
  }
  return `/forum?${params.toString()}`;
}

export function groupTopicsByDate(topics: Topic[]): [string, Topic[]][] {
  const map = new Map<string, Topic[]>();
  for (const topic of topics) {
    const group = map.get(topic.date) ?? [];
    group.push(topic);
    map.set(topic.date, group);
  }
  return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
}

export function countVisibleComments(comments: Comment[]): number {
  return comments.reduce(
    (sum, comment) => sum + 1 + (comment.replies?.length ?? 0),
    0
  );
}
