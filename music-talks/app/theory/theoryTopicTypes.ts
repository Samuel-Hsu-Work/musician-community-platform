/** Shared shape for all Theory sidebar topics across domains. */

export type TheoryTopicKind = "concept" | "symbol" | "scale";

export interface TheoryTopicCategory {
  id: string;
  label: string;
  shortLabel: string;
}

export interface TheoryTopic {
  id: string;
  name: string;
  category: string;
  kind: TheoryTopicKind;
  /** Scale topics only */
  notes?: string[];
  rootFrequency?: number;
}

export function getCategoryLabel(
  categories: TheoryTopicCategory[],
  categoryId: string
): string {
  return categories.find((c) => c.id === categoryId)?.label ?? categoryId;
}
