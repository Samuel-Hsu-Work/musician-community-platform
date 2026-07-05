import prisma from '../config/database';
import { THEORY_TOPIC_CATALOG } from '../data/theoryTopicCatalog';

const TOPIC_NAME_BY_ID = new Map(
  THEORY_TOPIC_CATALOG.map((t) => [t.id, t.name])
);

const TOPIC_DOMAIN_BY_ID = new Map(
  THEORY_TOPIC_CATALOG.map((t) => [t.id, t.domainId])
);

export const THEORY_DOMAIN_LABELS: Record<string, string> = {
  'notation-reading': 'Notation & Reading',
  'rhythm-meter': 'Rhythm & Meter',
  'pitch-scales-keys': 'Pitch, Scales & Keys',
  intervals: 'Intervals',
  'chords-harmony': 'Chords & Harmony',
  'form-analysis': 'Form & Analysis',
};

export const THEORY_DOMAIN_ORDER = [
  'notation-reading',
  'rhythm-meter',
  'pitch-scales-keys',
  'intervals',
  'chords-harmony',
  'form-analysis',
] as const;

export interface LearningStyleColumn {
  id: string;
  label: string;
  shortLabel: string;
  aiGuidance: string;
}

export interface LearningTableTopicRow {
  topicId: string;
  topicName: string;
  domainId: string;
  kind: string;
  insights: AdminInsightRecord[];
  coveredStyleIds: string[];
}

export interface LearningTableDomainGroup {
  domainId: string;
  domainLabel: string;
  topicCount: number;
  insightCount: number;
  topicsWithInsights: number;
  topics: LearningTableTopicRow[];
}

export interface LearningTableMatrix {
  summary: {
    approved: number;
    draft: number;
    rejected: number;
    total: number;
    topicsWithApproved: number;
  };
  learningStyles: LearningStyleColumn[];
  domains: LearningTableDomainGroup[];
}

export interface TheoryInsightRecord {
  id: string;
  theoryTopicId: string;
  categoryId: string;
  categoryLabel: string;
  title: string;
  content: string;
  promptSummary: string;
  sourceType: string;
  sourceLikeCount: number;
}

export interface TheoryInsightPromptSlice {
  categoryLabel: string;
  title: string;
  promptSummary: string;
}

export interface AdminInsightRecord {
  id: string;
  theoryTopicId: string;
  theoryTopicName: string;
  categoryId: string;
  categoryLabel: string;
  title: string;
  content: string;
  promptSummary: string;
  sourceType: string;
  sourceRef: string;
  sourceLikeCount: number;
  sourcePreview: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export class TheoryInsightService {
  async getApprovedForTopic(
    theoryTopicId: string,
    categoryIds?: string[]
  ): Promise<TheoryInsightRecord[]> {
    const rows = await prisma.explanationCategoryInsight.findMany({
      where: {
        theoryTopicId,
        status: 'approved',
        ...(categoryIds?.length
          ? { categoryId: { in: categoryIds } }
          : {}),
      },
      include: {
        category: { select: { label: true } },
      },
      orderBy: [{ sourceLikeCount: 'desc' }, { updatedAt: 'desc' }],
      take: 5,
    });

    return rows.map((row) => ({
      id: row.id,
      theoryTopicId: row.theoryTopicId,
      categoryId: row.categoryId,
      categoryLabel: row.category.label,
      title: row.title,
      content: row.content,
      promptSummary: row.promptSummary,
      sourceType: row.sourceType,
      sourceLikeCount: row.sourceLikeCount,
    }));
  }

  async getPromptSlicesForTopic(
    theoryTopicId: string,
    categoryIds?: string[]
  ): Promise<TheoryInsightPromptSlice[]> {
    const rows = await this.getApprovedForTopic(theoryTopicId, categoryIds);
    return rows.map((row) => ({
      categoryLabel: row.categoryLabel,
      title: row.title,
      promptSummary: row.promptSummary,
    }));
  }

  async sourceAlreadyProcessed(sourceRef: string): Promise<boolean> {
    const existing = await prisma.explanationCategoryInsight.findUnique({
      where: { sourceRef },
      select: { id: true },
    });
    return Boolean(existing);
  }

  async getBySourceRef(sourceRef: string) {
    const row = await prisma.explanationCategoryInsight.findUnique({
      where: { sourceRef },
      select: {
        id: true,
        title: true,
        status: true,
        theoryTopicId: true,
        categoryId: true,
        category: { select: { label: true } },
      },
    });
    if (!row) return null;
    return {
      id: row.id,
      title: row.title,
      status: row.status,
      theoryTopicId: row.theoryTopicId,
      categoryId: row.categoryId,
      categoryLabel: row.category.label,
    };
  }

  async getLearningTableSummary() {
    const [approved, draft, rejected, total] = await Promise.all([
      prisma.explanationCategoryInsight.count({ where: { status: 'approved' } }),
      prisma.explanationCategoryInsight.count({ where: { status: 'draft' } }),
      prisma.explanationCategoryInsight.count({ where: { status: 'rejected' } }),
      prisma.explanationCategoryInsight.count(),
    ]);

    return { approved, draft, rejected, total };
  }

  async createInsight(data: {
    theoryTopicId: string;
    categoryId: string;
    title: string;
    content: string;
    promptSummary: string;
    sourceType: string;
    sourceRef: string;
    sourceLikeCount: number;
    status: 'draft' | 'approved' | 'rejected';
  }) {
    return prisma.explanationCategoryInsight.create({ data });
  }

  async listForAdmin(status?: string): Promise<AdminInsightRecord[]> {
    const rows = await prisma.explanationCategoryInsight.findMany({
      where:
        status && status !== 'all'
          ? { status }
          : undefined,
      include: {
        category: { select: { label: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    const mapped = await Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        theoryTopicId: row.theoryTopicId,
        theoryTopicName:
          TOPIC_NAME_BY_ID.get(row.theoryTopicId) ?? row.theoryTopicId,
        categoryId: row.categoryId,
        categoryLabel: row.category.label,
        title: row.title,
        content: row.content,
        promptSummary: row.promptSummary,
        sourceType: row.sourceType,
        sourceRef: row.sourceRef,
        sourceLikeCount: row.sourceLikeCount,
        sourcePreview: await this.getSourcePreview(row.sourceRef),
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }))
    );

    return mapped;
  }

  async getLearningTableMatrix(options: {
    status?: 'approved' | 'all';
    domainId?: string;
    withInsightsOnly?: boolean;
  }): Promise<LearningTableMatrix> {
    const status = options.status ?? 'approved';
    const insights = await this.listForAdmin(status === 'all' ? 'all' : 'approved');

    const insightsByTopic = new Map<string, AdminInsightRecord[]>();
    for (const insight of insights) {
      const list = insightsByTopic.get(insight.theoryTopicId) ?? [];
      list.push(insight);
      insightsByTopic.set(insight.theoryTopicId, list);
    }

    const styleRows = await prisma.explanationCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        label: true,
        shortLabel: true,
        aiGuidance: true,
      },
    });

    const summary = await this.getLearningTableSummary();
    const topicsWithApproved = new Set(
      insights.filter((i) => i.status === 'approved').map((i) => i.theoryTopicId)
    ).size;

    const domainIds = options.domainId
      ? [options.domainId]
      : [...THEORY_DOMAIN_ORDER];

    const domains: LearningTableDomainGroup[] = domainIds.map((domainId) => {
      const domainLabel =
        THEORY_DOMAIN_LABELS[domainId] ?? domainId;

      let catalogTopics = THEORY_TOPIC_CATALOG.filter(
        (t) => t.domainId === domainId
      );

      if (options.withInsightsOnly) {
        catalogTopics = catalogTopics.filter((t) =>
          insightsByTopic.has(t.id)
        );
      }

      const topics: LearningTableTopicRow[] = catalogTopics.map((topic) => {
        const topicInsights = insightsByTopic.get(topic.id) ?? [];
        return {
          topicId: topic.id,
          topicName: topic.name,
          domainId: topic.domainId,
          kind: topic.kind,
          insights: topicInsights,
          coveredStyleIds: [
            ...new Set(topicInsights.map((i) => i.categoryId)),
          ],
        };
      });

      const insightCount = topics.reduce(
        (sum, t) => sum + t.insights.length,
        0
      );

      return {
        domainId,
        domainLabel,
        topicCount: topics.length,
        insightCount,
        topicsWithInsights: topics.filter((t) => t.insights.length > 0).length,
        topics,
      };
    });

    return {
      summary: {
        ...summary,
        topicsWithApproved,
      },
      learningStyles: styleRows,
      domains,
    };
  }

  async updateStatus(
    id: string,
    status: 'approved' | 'rejected' | 'draft'
  ) {
    const existing = await prisma.explanationCategoryInsight.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new Error('Insight not found');
    }

    return prisma.explanationCategoryInsight.update({
      where: { id },
      data: { status },
    });
  }

  private async getSourcePreview(sourceRef: string): Promise<string | null> {
    const [kind, id] = sourceRef.split(':');
    if (!id) return null;

    if (kind === 'topic') {
      const topic = await prisma.topic.findUnique({
        where: { id },
        select: { title: true, content: true },
      });
      if (!topic) return null;
      return `${topic.title}\n\n${topic.content}`.slice(0, 500);
    }

    if (kind === 'comment') {
      const comment = await prisma.comment.findUnique({
        where: { id },
        select: { text: true },
      });
      return comment?.text.slice(0, 500) ?? null;
    }

    return null;
  }
}

export const theoryInsightService = new TheoryInsightService();
