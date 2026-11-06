/**
 * Forum -> AI learning table pipeline (ADR 008) and the admin review endpoints
 * that curate its rows. OpenAI is replaced by the in-process fake; everything else
 * (Express app, Prisma, PostgreSQL) is real.
 */
import type { Prisma } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  bearer,
  client,
  prisma,
  registerAdmin,
  uniqueUsername,
  type RegisteredUser,
} from './support/api';
import { fakeOpenAi } from './support/fakeOpenAi';

vi.hoisted(() => {
  process.env.OPENAI_API_KEY = 'test-key';
});

const CRON_SECRET = 'test-cron-secret';
const LIKER_COUNT = 4; // FORUM_INSIGHT_MIN_LIKES is 3 in tests

let admin: RegisteredUser;
let likerIds: string[] = [];
let arrangedCount = 0;

/**
 * A string that appears only in one arranged piece of forum text. Bracketed so
 * that `marker-1` can never be found inside `marker-10`.
 */
function uniqueMarker(label: string): string {
  arrangedCount += 1;
  return `[${label}-marker-${arrangedCount}]`;
}

/** Forum users who exist only to like arranged content. */
async function arrangeLikers(): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 0; i < LIKER_COUNT; i += 1) {
    const username = uniqueUsername('liker');
    const user = await prisma.user.create({
      data: { username, email: `${username}@example.test`, password: 'not-used-for-login' },
    });
    ids.push(user.id);
  }
  return ids;
}

async function arrangeTopic(
  options: { likes: number; marker?: string } & Partial<Prisma.TopicUncheckedCreateInput>
) {
  const { likes, marker = uniqueMarker('topic'), ...overrides } = options;
  const topic = await prisma.topic.create({
    data: {
      date: '2026-01-01',
      title: `Topic title ${marker}`,
      content: `Topic content ${marker}`,
      type: 'community_post',
      ...overrides,
    },
  });
  await prisma.topicLike.createMany({
    data: likerIds.slice(0, likes).map((userId) => ({ topicId: topic.id, userId })),
  });
  return { ...topic, marker };
}

async function arrangeComment(topicId: string, options: { likes: number; marker?: string }) {
  const marker = options.marker ?? uniqueMarker('comment');
  const comment = await prisma.comment.create({
    data: { topicId, username: 'commenter', text: `Reply text ${marker}` },
  });
  await prisma.commentLike.createMany({
    data: likerIds.slice(0, options.likes).map((userId) => ({ commentId: comment.id, userId })),
  });
  return { ...comment, marker };
}

async function arrangeInsight(overrides: Partial<Prisma.ExplanationCategoryInsightUncheckedCreateInput> = {}) {
  const marker = uniqueMarker('insight');
  return prisma.explanationCategoryInsight.create({
    data: {
      theoryTopicId: 'major-triad',
      categoryId: 'everyday-life',
      title: `Insight ${marker}`,
      content: `Content ${marker}`,
      promptSummary: `Summary ${marker}`,
      sourceType: 'forum_topic',
      sourceRef: `topic:${marker}`,
      sourceLikeCount: 3,
      status: 'draft',
      ...overrides,
    },
  });
}

/** The JSON verdict the extraction agent is asked to return. */
function aiVerdict(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    shouldStore: true,
    approve: false,
    theoryTopicId: 'major-triad',
    categoryId: 'everyday-life',
    title: 'Major triad as a happy family photo',
    content: 'A major triad stacks a major third and a minor third.',
    promptSummary: 'Compare the triad to three people standing in a stable pose.',
    reason: 'Clear everyday analogy',
    ...overrides,
  });
}

const DECLINE = aiVerdict({
  shouldStore: false,
  theoryTopicId: null,
  categoryId: null,
  reason: 'Off-topic chat',
});

/**
 * Answers each prompt by the first marker it contains (so list a reply's marker
 * before its parent post's, since a reply prompt quotes the parent). Unmatched
 * prompts get a decline.
 */
function replyByMarker(replies: Array<[marker: string, reply: string | (() => string)]>) {
  fakeOpenAi.replyWith((prompt) => {
    const match = replies.find(([marker]) => prompt.includes(marker));
    if (!match) return DECLINE;
    const reply = match[1];
    return typeof reply === 'function' ? reply() : reply;
  });
}

function promptsMentioning(marker: string): string[] {
  return fakeOpenAi.prompts.filter((prompt) => prompt.includes(marker));
}

function runPipelineAsAdmin() {
  return client().post('/api/admin/forum-insights/run').set(...bearer(admin));
}

function runPipelineAsCron(secret?: string) {
  const req = client().post('/api/cron/process-forum-insights');
  return secret === undefined ? req : req.set('x-cron-secret', secret);
}

function asAdmin() {
  const http = client();
  return {
    get: (url: string) => http.get(url).set(...bearer(admin)),
    patch: (url: string, body: Record<string, unknown>) =>
      http.patch(url).set(...bearer(admin)).send(body),
  };
}

beforeAll(async () => {
  admin = await registerAdmin();
  likerIds = await arrangeLikers();
});

beforeEach(async () => {
  fakeOpenAi.reset();
  await prisma.explanationCategoryInsight.deleteMany();
  await prisma.topic.deleteMany(); // cascades to comments and likes
});

describe('choosing forum candidates', () => {
  it('sends only topics and comments with at least the minimum number of likes to the AI', async () => {
    const popularTopic = await arrangeTopic({ likes: 3 });
    const quietTopic = await arrangeTopic({ likes: 2 });
    const popularComment = await arrangeComment(quietTopic.id, { likes: 3 });
    const quietComment = await arrangeComment(popularTopic.id, { likes: 2 });

    const res = await runPipelineAsAdmin();

    expect(res.status).toBe(200);
    expect(res.body.scanned).toBe(2);
    expect(promptsMentioning(popularTopic.marker)).toHaveLength(1);
    expect(promptsMentioning(popularComment.marker)).toHaveLength(1);
    expect(promptsMentioning(quietComment.marker)).toHaveLength(0);
    // The quiet topic only appears as the popular comment's parent context.
    expect(promptsMentioning(quietTopic.marker)).toEqual(promptsMentioning(popularComment.marker));
  });

  it('ignores hidden topics and comments under them', async () => {
    const hiddenTopic = await arrangeTopic({ likes: 3, hidden: true });
    const commentOnHidden = await arrangeComment(hiddenTopic.id, { likes: 3 });
    replyByMarker([
      [commentOnHidden.marker, aiVerdict()],
      [hiddenTopic.marker, aiVerdict()],
    ]);

    const res = await runPipelineAsAdmin();

    expect(res.status).toBe(200);
    expect(res.body.scanned).toBe(0);
    expect(fakeOpenAi.prompts).toHaveLength(0);
    expect(await prisma.explanationCategoryInsight.count()).toBe(0);
  });

  it('does not treat AI-generated daily discussion topics as community explanations', async () => {
    const dailyTopic = await arrangeTopic({ likes: 3, type: 'daily_discussion' });
    replyByMarker([[dailyTopic.marker, aiVerdict()]]);

    const res = await runPipelineAsAdmin();

    expect(res.status).toBe(200);
    expect(promptsMentioning(dailyTopic.marker)).toHaveLength(0);
    expect(await prisma.explanationCategoryInsight.count()).toBe(0);
  });

  it('still considers community replies posted under a daily discussion topic', async () => {
    const dailyTopic = await arrangeTopic({ likes: 0, type: 'daily_discussion' });
    const reply = await arrangeComment(dailyTopic.id, { likes: 3 });
    replyByMarker([[reply.marker, aiVerdict()]]);

    const res = await runPipelineAsAdmin();

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ scanned: 1, stored: 1 });
    expect(await prisma.explanationCategoryInsight.findMany()).toEqual([
      expect.objectContaining({ sourceRef: `comment:${reply.id}`, sourceType: 'forum_comment' }),
    ]);
  });
});

describe('extracting insights', () => {
  it('stores an accepted topic as a draft learning-table row and reports it', async () => {
    const topic = await arrangeTopic({ likes: 3 });
    replyByMarker([[topic.marker, aiVerdict()]]);

    const res = await runPipelineAsAdmin();

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, scanned: 1, stored: 1, skipped: 0, errors: [] });
    const rows = await prisma.explanationCategoryInsight.findMany();
    expect(rows).toEqual([
      expect.objectContaining({
        theoryTopicId: 'major-triad',
        categoryId: 'everyday-life',
        title: 'Major triad as a happy family photo',
        content: 'A major triad stacks a major third and a minor third.',
        promptSummary: 'Compare the triad to three people standing in a stable pose.',
        sourceType: 'forum_topic',
        sourceRef: `topic:${topic.id}`,
        sourceLikeCount: 3,
        status: 'draft',
      }),
    ]);
    expect(res.body.storedDetails).toEqual([
      expect.objectContaining({
        insightId: rows[0].id,
        sourceType: 'forum_topic',
        sourceRef: `topic:${topic.id}`,
        sourceLabel: topic.title,
        theoryTopicId: 'major-triad',
        domainId: 'chords-harmony',
        categoryId: 'everyday-life',
        status: 'draft',
      }),
    ]);
  });

  it('stores an accepted comment with its own like count and source reference', async () => {
    const topic = await arrangeTopic({ likes: 0 });
    const comment = await arrangeComment(topic.id, { likes: 4 });
    replyByMarker([[comment.marker, aiVerdict({ theoryTopicId: 'staff', categoryId: 'art' })]]);

    const res = await runPipelineAsAdmin();

    expect(res.status).toBe(200);
    expect(res.body.stored).toBe(1);
    const rows = await prisma.explanationCategoryInsight.findMany();
    expect(rows).toEqual([
      expect.objectContaining({
        theoryTopicId: 'staff',
        categoryId: 'art',
        sourceType: 'forum_comment',
        sourceRef: `comment:${comment.id}`,
        sourceLikeCount: 4,
        status: 'draft',
      }),
    ]);
  });

  it('shows the AI the parent post alongside a reply', async () => {
    const parent = await arrangeTopic({ likes: 0 });
    const reply = await arrangeComment(parent.id, { likes: 3 });

    await runPipelineAsAdmin();

    const [prompt] = promptsMentioning(reply.marker);
    expect(prompt).toContain(parent.title);
    expect(prompt).toContain(parent.content);
    expect(prompt).toContain(reply.text);
  });

  it('does not store content the AI declines, and reports why', async () => {
    const topic = await arrangeTopic({ likes: 3 });
    replyByMarker([[topic.marker, DECLINE]]);

    const res = await runPipelineAsAdmin();

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ scanned: 1, stored: 0, skipped: 1 });
    expect(res.body.skipDetails).toEqual([
      expect.objectContaining({
        sourceRef: `topic:${topic.id}`,
        reason: 'ai_rejected',
        detail: 'Off-topic chat',
      }),
    ]);
    expect(await prisma.explanationCategoryInsight.count()).toBe(0);
  });

  it.each([
    ['a theory topic outside the catalog', { theoryTopicId: 'not-a-catalog-topic' }],
    ['a learning style that does not exist', { categoryId: 'not-a-style' }],
    ['no theory topic', { theoryTopicId: null }],
    ['no learning style', { categoryId: null }],
  ])('refuses to store a classification with %s', async (_label, classification) => {
    const topic = await arrangeTopic({ likes: 3 });
    replyByMarker([[topic.marker, aiVerdict(classification)]]);

    const res = await runPipelineAsAdmin();

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ stored: 0, skipped: 1, errors: [] });
    expect(res.body.skipDetails[0].reason).toBe('ai_rejected');
    expect(await prisma.explanationCategoryInsight.count()).toBe(0);
  });

  it('skips a candidate whose AI answer is not JSON and still processes the rest', async () => {
    const garbled = await arrangeTopic({ likes: 3 });
    const good = await arrangeTopic({ likes: 3 });
    replyByMarker([
      [garbled.marker, 'Sorry, I cannot answer in JSON today.'],
      [good.marker, aiVerdict()],
    ]);

    const res = await runPipelineAsAdmin();

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ scanned: 2, stored: 1, skipped: 1, errors: [] });
    expect(res.body.skipDetails).toEqual([
      expect.objectContaining({ sourceRef: `topic:${garbled.id}`, reason: 'invalid_response' }),
    ]);
    const rows = await prisma.explanationCategoryInsight.findMany();
    expect(rows.map((row) => row.sourceRef)).toEqual([`topic:${good.id}`]);
  });

  it('records an AI provider failure for one candidate without aborting the run', async () => {
    const failing = await arrangeTopic({ likes: 3 });
    const good = await arrangeTopic({ likes: 3 });
    replyByMarker([
      [
        failing.marker,
        () => {
          throw new Error('upstream exploded');
        },
      ],
      [good.marker, aiVerdict()],
    ]);

    const res = await runPipelineAsAdmin();

    expect(res.status).toBe(200);
    expect(res.body.stored).toBe(1);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0]).toContain(failing.id);
    const rows = await prisma.explanationCategoryInsight.findMany();
    expect(rows.map((row) => row.sourceRef)).toEqual([`topic:${good.id}`]);
  });
});

describe('re-running the pipeline', () => {
  it('never re-sends an ingested topic or reply to the AI, even after an admin rejected its insight', async () => {
    const topic = await arrangeTopic({ likes: 3 });
    const reply = await arrangeComment(topic.id, { likes: 3 });
    replyByMarker([
      [reply.marker, aiVerdict({ categoryId: 'art' })],
      [topic.marker, aiVerdict()],
    ]);
    await runPipelineAsAdmin();
    const ingested = await prisma.explanationCategoryInsight.findMany({ orderBy: { sourceRef: 'asc' } });
    expect(ingested).toHaveLength(2);
    const topicInsight = ingested.find((row) => row.sourceRef === `topic:${topic.id}`)!;
    const rejection = await asAdmin().patch(`/api/admin/insights/${topicInsight.id}`, { status: 'rejected' });
    expect(rejection.status).toBe(200);
    fakeOpenAi.reset();
    replyByMarker([
      [reply.marker, aiVerdict({ title: 'A second extraction' })],
      [topic.marker, aiVerdict({ title: 'A second extraction' })],
    ]);

    const res = await runPipelineAsAdmin();

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ scanned: 2, stored: 0, skipped: 2 });
    expect(res.body.skipDetails).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceRef: `topic:${topic.id}`,
          reason: 'already_processed',
          existingInsightStatus: 'rejected',
        }),
        expect.objectContaining({
          sourceRef: `comment:${reply.id}`,
          reason: 'already_processed',
          existingInsightStatus: 'draft',
        }),
      ])
    );
    expect(fakeOpenAi.prompts).toHaveLength(0);
    const rows = await prisma.explanationCategoryInsight.findMany({ orderBy: { sourceRef: 'asc' } });
    expect(rows.map(({ id, title, status }) => ({ id, title, status }))).toEqual(
      ingested.map(({ id, title }) => ({
        id,
        title,
        status: id === topicInsight.id ? 'rejected' : 'draft',
      }))
    );
  });
});

describe('triggering a run', () => {
  it('runs from the cron endpoint with the cron secret', async () => {
    const topic = await arrangeTopic({ likes: 3 });
    replyByMarker([[topic.marker, aiVerdict()]]);

    const res = await runPipelineAsCron(CRON_SECRET);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, scanned: 1, stored: 1, skipped: 0, errors: [] });
    expect(await prisma.explanationCategoryInsight.count({ where: { sourceRef: `topic:${topic.id}` } })).toBe(1);
  });

  it.each([
    ['a missing', undefined],
    ['a wrong', 'not-the-secret'],
  ])('refuses a cron run with %s secret and processes nothing', async (_label, secret) => {
    const topic = await arrangeTopic({ likes: 3 });
    replyByMarker([[topic.marker, aiVerdict()]]);

    const res = await runPipelineAsCron(secret);

    expect(res.status).toBe(403);
    expect(fakeOpenAi.prompts).toHaveLength(0);
    expect(await prisma.explanationCategoryInsight.count()).toBe(0);
  });
});

describe('without an OpenAI API key', () => {
  /**
   * The key is read once at startup, so boot a second copy of the app with the key
   * unset (same database, same fake provider).
   */
  let appWithoutKey: Parameters<typeof request>[0];
  let disconnectFreshPrisma: () => Promise<void>;

  beforeAll(async () => {
    const savedKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = '';
    vi.resetModules();
    try {
      const { createApp } = await import('../src/app');
      const { default: freshPrisma } = await import('../src/config/database');
      appWithoutKey = createApp().app;
      disconnectFreshPrisma = () => freshPrisma.$disconnect();
    } finally {
      process.env.OPENAI_API_KEY = savedKey;
    }
  });

  afterAll(async () => {
    await disconnectFreshPrisma?.();
  });

  it('reports the pipeline as unavailable to admins and to cron, storing nothing', async () => {
    await arrangeTopic({ likes: 3 });

    const adminRun = await request(appWithoutKey)
      .post('/api/admin/forum-insights/run')
      .set(...bearer(admin));
    const cronRun = await request(appWithoutKey)
      .post('/api/cron/process-forum-insights')
      .set('x-cron-secret', CRON_SECRET);

    expect(adminRun.status).toBe(503);
    expect(cronRun.status).toBe(503);
    expect(await prisma.explanationCategoryInsight.count()).toBe(0);
  });
});

describe('reviewing insights', () => {
  it('lists drafts by default and filters by status', async () => {
    const draft = await arrangeInsight({ status: 'draft' });
    const approved = await arrangeInsight({ status: 'approved' });
    const rejected = await arrangeInsight({ status: 'rejected' });
    const idsFor = async (query: string) => {
      const res = await asAdmin().get(`/api/admin/insights${query}`);
      expect(res.status).toBe(200);
      return res.body.insights.map((insight: { id: string }) => insight.id).sort();
    };

    expect(await idsFor('')).toEqual([draft.id]);
    expect(await idsFor('?status=approved')).toEqual([approved.id]);
    expect(await idsFor('?status=rejected')).toEqual([rejected.id]);
    expect(await idsFor('?status=all')).toEqual([draft.id, approved.id, rejected.id].sort());
  });

  it('rejects an unknown status filter', async () => {
    const res = await asAdmin().get('/api/admin/insights?status=pending');

    expect(res.status).toBe(400);
  });

  it('shows reviewers the forum text each insight came from', async () => {
    const topic = await arrangeTopic({ likes: 3 });
    const comment = await arrangeComment(topic.id, { likes: 3 });
    await arrangeInsight({ sourceType: 'forum_topic', sourceRef: `topic:${topic.id}` });
    await arrangeInsight({ sourceType: 'forum_comment', sourceRef: `comment:${comment.id}` });

    const res = await asAdmin().get('/api/admin/insights?status=draft');

    expect(res.status).toBe(200);
    const previewBySource = Object.fromEntries(
      res.body.insights.map((i: { sourceRef: string; sourcePreview: string }) => [i.sourceRef, i.sourcePreview])
    );
    expect(previewBySource).toEqual({
      [`topic:${topic.id}`]: `${topic.title}\n\n${topic.content}`,
      [`comment:${comment.id}`]: comment.text,
    });
  });

  it('approving a draft moves it into the learning table', async () => {
    const draft = await arrangeInsight({ status: 'draft' });

    const res = await asAdmin().patch(`/api/admin/insights/${draft.id}`, { status: 'approved' });

    expect(res.status).toBe(200);
    expect(res.body.insight).toMatchObject({ id: draft.id, status: 'approved' });
    const table = await asAdmin().get('/api/admin/insights/learning-table');
    expect(table.body.insights.map((i: { id: string }) => i.id)).toEqual([draft.id]);
  });

  it('rejects an invalid status change and leaves the insight unchanged', async () => {
    const draft = await arrangeInsight({ status: 'draft' });

    const res = await asAdmin().patch(`/api/admin/insights/${draft.id}`, { status: 'published' });

    expect(res.status).toBe(400);
    const stored = await prisma.explanationCategoryInsight.findUniqueOrThrow({ where: { id: draft.id } });
    expect(stored.status).toBe('draft');
  });

  it('returns 404 when reviewing an insight that does not exist', async () => {
    const res = await asAdmin().patch('/api/admin/insights/does-not-exist', { status: 'approved' });

    expect(res.status).toBe(404);
  });
});

describe('learning table views', () => {
  it('summarizes counts by status and lists only approved insights', async () => {
    const approved = await arrangeInsight({ status: 'approved' });
    await arrangeInsight({ status: 'draft' });
    await arrangeInsight({ status: 'draft' });
    await arrangeInsight({ status: 'rejected' });

    const res = await asAdmin().get('/api/admin/insights/learning-table');

    expect(res.status).toBe(200);
    expect(res.body.summary).toEqual({ approved: 1, draft: 2, rejected: 1, total: 4 });
    expect(res.body.insights.map((i: { id: string }) => i.id)).toEqual([approved.id]);
  });

  it('places approved insights in the matrix cell for their topic and learning style', async () => {
    const approved = await arrangeInsight({
      status: 'approved',
      theoryTopicId: 'major-triad',
      categoryId: 'art',
    });
    await arrangeInsight({ status: 'draft', theoryTopicId: 'major-triad', categoryId: 'performance' });

    const res = await asAdmin().get('/api/admin/insights/learning-table/matrix');

    expect(res.status).toBe(200);
    const { matrix } = res.body;
    expect(matrix.summary).toMatchObject({ approved: 1, draft: 1, total: 2, topicsWithApproved: 1 });
    expect(matrix.learningStyles.map((s: { id: string }) => s.id)).toEqual(
      expect.arrayContaining(['music-core', 'art', 'everyday-life', 'performance'])
    );
    const harmony = matrix.domains.find((d: { domainId: string }) => d.domainId === 'chords-harmony');
    const majorTriad = harmony.topics.find((t: { topicId: string }) => t.topicId === 'major-triad');
    expect(majorTriad.insights.map((i: { id: string }) => i.id)).toEqual([approved.id]);
    expect(majorTriad.coveredStyleIds).toEqual(['art']);
    expect(harmony.insightCount).toBe(1);
  });

  it('includes drafts in the matrix when asked for all statuses', async () => {
    await arrangeInsight({ status: 'approved', theoryTopicId: 'major-triad', categoryId: 'art' });
    await arrangeInsight({ status: 'draft', theoryTopicId: 'major-triad', categoryId: 'performance' });

    const res = await asAdmin().get('/api/admin/insights/learning-table/matrix?status=all');

    expect(res.status).toBe(200);
    const harmony = res.body.matrix.domains.find((d: { domainId: string }) => d.domainId === 'chords-harmony');
    const majorTriad = harmony.topics.find((t: { topicId: string }) => t.topicId === 'major-triad');
    expect([...majorTriad.coveredStyleIds].sort()).toEqual(['art', 'performance']);
  });

  it('narrows the matrix to one domain and to topics that have insights', async () => {
    await arrangeInsight({ status: 'approved', theoryTopicId: 'major-triad' });
    await arrangeInsight({ status: 'approved', theoryTopicId: 'staff' });

    const res = await asAdmin().get(
      '/api/admin/insights/learning-table/matrix?domainId=chords-harmony&withInsightsOnly=true'
    );

    expect(res.status).toBe(200);
    const { domains } = res.body.matrix;
    expect(domains.map((d: { domainId: string }) => d.domainId)).toEqual(['chords-harmony']);
    expect(domains[0].topics.map((t: { topicId: string }) => t.topicId)).toEqual(['major-triad']);
  });

  it('rejects an unknown domain filter on the matrix', async () => {
    const res = await asAdmin().get('/api/admin/insights/learning-table/matrix?domainId=not-a-domain');

    expect(res.status).toBe(400);
  });
});
