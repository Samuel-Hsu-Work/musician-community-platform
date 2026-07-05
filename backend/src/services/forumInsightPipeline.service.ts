import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import prisma from '../config/database';
import { THEORY_TOPIC_CATALOG } from '../data/theoryTopicCatalog';
import { EXPLANATION_CATEGORIES_SEED } from '../data/explanationCategoriesSeed';
import { theoryInsightService } from './theoryInsight.service';

const VALID_CATEGORY_IDS = new Set(
  EXPLANATION_CATEGORIES_SEED.map((c) => c.id)
);

const TOPIC_BY_ID = new Map(
  THEORY_TOPIC_CATALOG.map((t) => [t.id, t.name])
);

const TOPIC_DOMAIN_BY_ID = new Map(
  THEORY_TOPIC_CATALOG.map((t) => [t.id, t.domainId])
);

const CATEGORY_LABEL_BY_ID = new Map(
  EXPLANATION_CATEGORIES_SEED.map((c) => [c.id, c.label])
);

const DOMAIN_LABELS: Record<string, string> = {
  'notation-reading': 'Notation & Reading',
  'rhythm-meter': 'Rhythm & Meter',
  'pitch-scales-keys': 'Pitch, Scales & Keys',
  intervals: 'Intervals',
  'chords-harmony': 'Chords & Harmony',
  'form-analysis': 'Form & Analysis',
};

function matrixCellLabel(theoryTopicId: string, categoryId: string): string {
  const domainId = TOPIC_DOMAIN_BY_ID.get(theoryTopicId) ?? '';
  const domainLabel = DOMAIN_LABELS[domainId] ?? domainId;
  const topicName = TOPIC_BY_ID.get(theoryTopicId) ?? theoryTopicId;
  const categoryLabel = CATEGORY_LABEL_BY_ID.get(categoryId) ?? categoryId;
  return `${domainLabel} → ${topicName} → ${categoryLabel}`;
}

interface ExtractionResult {
  shouldStore: boolean;
  approve: boolean;
  theoryTopicId: string | null;
  categoryId: string | null;
  title: string;
  content: string;
  promptSummary: string;
  reason: string;
}

export interface PipelineSkipDetail {
  sourceType: 'forum_topic' | 'forum_comment';
  sourceRef: string;
  sourceLabel: string;
  likeCount: number;
  reason: 'already_processed' | 'ai_rejected' | 'invalid_response';
  detail: string;
  existingInsightStatus?: string;
  theoryTopicId?: string;
  theoryTopicName?: string;
  domainId?: string;
  domainLabel?: string;
  categoryId?: string;
  categoryLabel?: string;
  matrixCell?: string;
}

export interface PipelineStoredDetail {
  insightId: string;
  theoryTopicId: string;
  theoryTopicName: string;
  domainId: string;
  domainLabel: string;
  categoryId: string;
  categoryLabel: string;
  matrixCell: string;
  title: string;
  sourceType: 'forum_topic' | 'forum_comment';
  sourceRef: string;
  sourceLabel: string;
  status: 'draft';
}

export interface PipelineRunResult {
  scanned: number;
  stored: number;
  skipped: number;
  errors: string[];
  skipDetails: PipelineSkipDetail[];
  storedDetails: PipelineStoredDetail[];
}

function getMinLikes(): number {
  const parsed = Number.parseInt(process.env.FORUM_INSIGHT_MIN_LIKES ?? '3', 10);
  return Number.isNaN(parsed) ? 3 : Math.max(1, parsed);
}

function parseExtractionJson(text: string): ExtractionResult | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]) as ExtractionResult;
    return parsed;
  } catch {
    return null;
  }
}

export class ForumInsightPipelineService {
  private model = openai('gpt-4o');

  async processHighLikeContent(): Promise<PipelineRunResult> {
    const minLikes = getMinLikes();
    const errors: string[] = [];
    const skipDetails: PipelineSkipDetail[] = [];
    const storedDetails: PipelineStoredDetail[] = [];
    let scanned = 0;
    let stored = 0;
    let skipped = 0;

    const topicCandidates = await prisma.topic.findMany({
      where: { type: 'community_post', hidden: false },
      include: { _count: { select: { likes: true } } },
    });

    for (const topic of topicCandidates) {
      const likeCount = topic._count.likes;
      if (likeCount < minLikes) continue;

      scanned++;
      const sourceRef = `topic:${topic.id}`;
      const sourceLabel = topic.title;

      if (await theoryInsightService.sourceAlreadyProcessed(sourceRef)) {
        skipped++;
        const existing = await theoryInsightService.getBySourceRef(sourceRef);
        const domainId = existing?.theoryTopicId
          ? TOPIC_DOMAIN_BY_ID.get(existing.theoryTopicId)
          : undefined;
        skipDetails.push({
          sourceType: 'forum_topic',
          sourceRef,
          sourceLabel,
          likeCount,
          reason: 'already_processed',
          detail: existing
            ? `Already in learning table (${existing.status}): ${existing.title}`
            : 'Already in learning table',
          existingInsightStatus: existing?.status,
          theoryTopicId: existing?.theoryTopicId,
          theoryTopicName: existing?.theoryTopicId
            ? TOPIC_BY_ID.get(existing.theoryTopicId)
            : undefined,
          domainId,
          domainLabel: domainId ? DOMAIN_LABELS[domainId] : undefined,
          categoryId: existing?.categoryId,
          categoryLabel: existing?.categoryLabel,
          matrixCell:
            existing?.theoryTopicId && existing?.categoryId
              ? matrixCellLabel(existing.theoryTopicId, existing.categoryId)
              : undefined,
        });
        continue;
      }

      try {
        const result = await this.extractFromForumText({
          text: `${topic.title}\n\n${topic.content}`,
          likeCount,
          sourceKind: 'forum_topic',
        });

        if (!result?.shouldStore || !result.theoryTopicId || !result.categoryId) {
          skipped++;
          skipDetails.push({
            sourceType: 'forum_topic',
            sourceRef,
            sourceLabel,
            likeCount,
            reason: result ? 'ai_rejected' : 'invalid_response',
            detail: result?.reason
              ? result.reason
              : result
                ? 'Missing topic or learning style classification'
                : 'Could not parse AI response',
          });
          continue;
        }

        const created = await theoryInsightService.createInsight({
          theoryTopicId: result.theoryTopicId,
          categoryId: result.categoryId,
          title: result.title,
          content: result.content,
          promptSummary: result.promptSummary,
          sourceType: 'forum_topic',
          sourceRef,
          sourceLikeCount: likeCount,
          status: 'draft',
        });
        stored++;
        const domainId =
          TOPIC_DOMAIN_BY_ID.get(result.theoryTopicId) ?? '';
        storedDetails.push({
          insightId: created.id,
          theoryTopicId: result.theoryTopicId,
          theoryTopicName:
            TOPIC_BY_ID.get(result.theoryTopicId) ?? result.theoryTopicId,
          domainId,
          domainLabel: DOMAIN_LABELS[domainId] ?? domainId,
          categoryId: result.categoryId,
          categoryLabel:
            CATEGORY_LABEL_BY_ID.get(result.categoryId) ?? result.categoryId,
          matrixCell: matrixCellLabel(
            result.theoryTopicId,
            result.categoryId
          ),
          title: result.title,
          sourceType: 'forum_topic',
          sourceRef,
          sourceLabel,
          status: 'draft',
        });
      } catch (err: unknown) {
        errors.push(
          `topic ${topic.id}: ${err instanceof Error ? err.message : 'unknown error'}`
        );
      }
    }

    const commentCandidates = await prisma.comment.findMany({
      include: {
        _count: { select: { likes: true } },
        topic: { select: { title: true, content: true, hidden: true } },
      },
    });

    for (const comment of commentCandidates) {
      const likeCount = comment._count.likes;
      if (likeCount < minLikes) continue;
      if (comment.topic.hidden) continue;

      scanned++;
      const sourceRef = `comment:${comment.id}`;
      const sourceLabel = comment.text.slice(0, 120);

      if (await theoryInsightService.sourceAlreadyProcessed(sourceRef)) {
        skipped++;
        const existing = await theoryInsightService.getBySourceRef(sourceRef);
        const domainId = existing?.theoryTopicId
          ? TOPIC_DOMAIN_BY_ID.get(existing.theoryTopicId)
          : undefined;
        skipDetails.push({
          sourceType: 'forum_comment',
          sourceRef,
          sourceLabel,
          likeCount,
          reason: 'already_processed',
          detail: existing
            ? `Already in learning table (${existing.status}): ${existing.title}`
            : 'Already in learning table',
          existingInsightStatus: existing?.status,
          theoryTopicId: existing?.theoryTopicId,
          theoryTopicName: existing?.theoryTopicId
            ? TOPIC_BY_ID.get(existing.theoryTopicId)
            : undefined,
          domainId,
          domainLabel: domainId ? DOMAIN_LABELS[domainId] : undefined,
          categoryId: existing?.categoryId,
          categoryLabel: existing?.categoryLabel,
          matrixCell:
            existing?.theoryTopicId && existing?.categoryId
              ? matrixCellLabel(existing.theoryTopicId, existing.categoryId)
              : undefined,
        });
        continue;
      }

      try {
        const result = await this.extractFromForumText({
          text: comment.text,
          likeCount,
          sourceKind: 'forum_comment',
          threadContext: {
            title: comment.topic.title,
            content: comment.topic.content,
          },
        });

        if (!result?.shouldStore || !result.theoryTopicId || !result.categoryId) {
          skipped++;
          skipDetails.push({
            sourceType: 'forum_comment',
            sourceRef,
            sourceLabel,
            likeCount,
            reason: result ? 'ai_rejected' : 'invalid_response',
            detail: result?.reason
              ? result.reason
              : result
                ? 'Missing topic or learning style classification'
                : 'Could not parse AI response',
          });
          continue;
        }

        const created = await theoryInsightService.createInsight({
          theoryTopicId: result.theoryTopicId,
          categoryId: result.categoryId,
          title: result.title,
          content: result.content,
          promptSummary: result.promptSummary,
          sourceType: 'forum_comment',
          sourceRef,
          sourceLikeCount: likeCount,
          status: 'draft',
        });
        stored++;
        const domainId =
          TOPIC_DOMAIN_BY_ID.get(result.theoryTopicId) ?? '';
        storedDetails.push({
          insightId: created.id,
          theoryTopicId: result.theoryTopicId,
          theoryTopicName:
            TOPIC_BY_ID.get(result.theoryTopicId) ?? result.theoryTopicId,
          domainId,
          domainLabel: DOMAIN_LABELS[domainId] ?? domainId,
          categoryId: result.categoryId,
          categoryLabel:
            CATEGORY_LABEL_BY_ID.get(result.categoryId) ?? result.categoryId,
          matrixCell: matrixCellLabel(
            result.theoryTopicId,
            result.categoryId
          ),
          title: result.title,
          sourceType: 'forum_comment',
          sourceRef,
          sourceLabel,
          status: 'draft',
        });
      } catch (err: unknown) {
        errors.push(
          `comment ${comment.id}: ${err instanceof Error ? err.message : 'unknown error'}`
        );
      }
    }

    return { scanned, stored, skipped, errors, skipDetails, storedDetails };
  }

  private async extractFromForumText({
    text,
    likeCount,
    sourceKind,
    threadContext,
  }: {
    text: string;
    likeCount: number;
    sourceKind: 'forum_topic' | 'forum_comment';
    threadContext?: { title: string; content: string };
  }): Promise<ExtractionResult | null> {
    const topicList = THEORY_TOPIC_CATALOG.map(
      (t) => `${t.id}: ${t.name}`
    ).join('\n');

    const categoryList = EXPLANATION_CATEGORIES_SEED.map(
      (c) => `${c.id}: ${c.label} — ${c.description}`
    ).join('\n');

    const forumTextBlock =
      sourceKind === 'forum_comment' && threadContext
        ? (() => {
            const parentText =
              `${threadContext.title}\n\n${threadContext.content}`.slice(
                0,
                2500
              );
            return `Parent Forum post (context):
"""
${parentText}
"""

Reply (${likeCount} likes):
"""
${text.slice(0, 1500)}
"""`;
          })()
        : `Forum text (${likeCount} likes):
"""
${text.slice(0, 4000)}
"""`;

    const prompt = `You review Forum posts about music learning. Decide if the text contains a clear, accurate explanation of ONE theory topic that is worth storing for future AI tutoring.

${forumTextBlock}

Valid theory topic ids (pick at most one, or null):
${topicList}

Valid learning style category ids (pick one, or null):
${categoryList}

Return ONLY valid JSON:
{
  "shouldStore": boolean,
  "approve": boolean,
  "theoryTopicId": string | null,
  "categoryId": string | null,
  "title": string,
  "content": string,
  "promptSummary": string,
  "reason": string
}

Rules:
- shouldStore true only if the text genuinely explains a catalog topic well (not off-topic chat).
- For replies: use the parent post to interpret short answers, analogies, or pronouns — but only store if the reply (with context) adds a real explanation angle.
- content: 2-4 standalone sentences for Theory UI (expand brief analogies using thread context; no "as mentioned above").
- promptSummary: 1-2 sentences distilled angle for an AI tutor prompt (no fluff).
- categoryId must match how the explanation is framed (STEM logic, art metaphor, everyday analogy, performance feel).
- approve true only if explanation is accurate and likeCount suggests community value.
- If unsure on topic or style, set shouldStore false.`;

    const { text: response } = await generateText({
      model: this.model,
      prompt,
    });

    const parsed = parseExtractionJson(response);
    if (!parsed) return null;

    if (
      parsed.theoryTopicId &&
      !TOPIC_BY_ID.has(parsed.theoryTopicId)
    ) {
      parsed.shouldStore = false;
    }

    if (
      parsed.categoryId &&
      !VALID_CATEGORY_IDS.has(parsed.categoryId)
    ) {
      parsed.shouldStore = false;
    }

    return parsed;
  }
}

export const forumInsightPipelineService = new ForumInsightPipelineService();
