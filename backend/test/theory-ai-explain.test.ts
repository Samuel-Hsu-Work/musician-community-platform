import { randomBytes } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.OPENAI_API_KEY = 'test-key';
});

import { bearer, client, prisma, registerUser, type RegisteredUser } from './support/api';
import { fakeOpenAi } from './support/fakeOpenAi';
import { EXPLANATION_CATEGORIES_SEED } from '../src/data/explanationCategoriesSeed';
import { THEORY_DEFINITIONS_SEED } from '../src/data/theoryDefinitionsSeed';

type CategoryId = 'music-core' | 'art' | 'everyday-life' | 'performance';
type InsightStatus = 'draft' | 'approved' | 'rejected';

/** Seeded aiGuidance text for a learning style, used to detect it inside a prompt. */
function guidanceOf(categoryId: CategoryId): string {
  const category = EXPLANATION_CATEGORIES_SEED.find((c) => c.id === categoryId);
  if (!category) throw new Error(`Unknown seeded category ${categoryId}`);
  return category.aiGuidance;
}

/**
 * The AI explanation cache lives for the whole file, so every test asks about a
 * notation name no other test uses.
 */
function uniqueNotation(label: string): string {
  return `${label} ${randomBytes(4).toString('hex')}`;
}

/** Inserts an AI learning-table row (normally produced by the forum pipeline). */
async function createInsight(input: {
  theoryTopicId: string;
  categoryId: CategoryId;
  status: InsightStatus;
  sourceLikeCount?: number;
}) {
  const marker = randomBytes(4).toString('hex');
  return prisma.explanationCategoryInsight.create({
    data: {
      theoryTopicId: input.theoryTopicId,
      categoryId: input.categoryId,
      status: input.status,
      title: `Insight ${marker}`,
      content: `Readable content ${marker}`,
      promptSummary: `Prompt angle ${marker}`,
      sourceType: 'forum_topic',
      sourceRef: `topic:${marker}`,
      sourceLikeCount: input.sourceLikeCount ?? 5,
    },
  });
}

async function setLearningStyle(user: RegisteredUser, categoryIds: CategoryId[]) {
  const res = await client()
    .patch('/api/account/learning-style')
    .set(...bearer(user))
    .send({ categoryIds });
  expect(res.status).toBe(200);
}

function explain(body: Record<string, unknown>, user?: RegisteredUser) {
  const req = client().post('/api/ai/explain-notation');
  return (user ? req.set(...bearer(user)) : req).send(body);
}

beforeEach(async () => {
  fakeOpenAi.reset();
  // This file owns the AI learning table; every test starts from an empty one.
  await prisma.explanationCategoryInsight.deleteMany();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Theory reference API', () => {
  it('returns the seeded standard definition for a notation id', async () => {
    const seeded = THEORY_DEFINITIONS_SEED.find((d) => d.id === 'treble-clef');
    expect(seeded).toBeDefined();

    const res = await client().get('/api/theory/notations/treble-clef');

    expect(res.status).toBe(200);
    expect(res.body.definition).toEqual({
      id: 'treble-clef',
      name: seeded!.name,
      category: seeded!.category,
      standardDefinition: seeded!.standardDefinition,
    });
  });

  it('responds 404 for a notation id that has no definition', async () => {
    const res = await client().get('/api/theory/notations/no-such-notation');

    expect(res.status).toBe(404);
    expect(res.body.definition).toBeUndefined();
  });

  it('lists learning-style categories in display order without their AI prompt guidance', async () => {
    const res = await client().get('/api/theory/explanation-categories');

    expect(res.status).toBe(200);
    const expected = [...EXPLANATION_CATEGORIES_SEED]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(({ aiGuidance: _hidden, ...publicFields }) => publicFields);
    expect(res.body.categories).toEqual(expected);
  });
});

describe('Topic insights API', () => {
  it('returns only approved insights for the requested topic', async () => {
    const approvedArt = await createInsight({ theoryTopicId: 'staff', categoryId: 'art', status: 'approved' });
    const approvedPerformance = await createInsight({
      theoryTopicId: 'staff',
      categoryId: 'performance',
      status: 'approved',
    });
    await createInsight({ theoryTopicId: 'staff', categoryId: 'art', status: 'draft' });
    await createInsight({ theoryTopicId: 'staff', categoryId: 'art', status: 'rejected' });
    await createInsight({ theoryTopicId: 'bass-clef', categoryId: 'art', status: 'approved' });

    const res = await client().get('/api/theory/topics/staff/insights');

    expect(res.status).toBe(200);
    const ids = res.body.insights.map((insight: { id: string }) => insight.id);
    expect(ids.sort()).toEqual([approvedArt.id, approvedPerformance.id].sort());
    expect(res.body.insights).toContainEqual(
      expect.objectContaining({
        id: approvedArt.id,
        theoryTopicId: 'staff',
        categoryId: 'art',
        categoryLabel: 'Art',
        title: approvedArt.title,
        content: approvedArt.content,
      })
    );
  });

  it('returns at most five insights, most-liked first', async () => {
    for (const sourceLikeCount of [4, 9, 1, 7, 3, 8]) {
      await createInsight({ theoryTopicId: 'grand-staff', categoryId: 'art', status: 'approved', sourceLikeCount });
    }

    const res = await client().get('/api/theory/topics/grand-staff/insights');

    expect(res.status).toBe(200);
    expect(res.body.insights.map((i: { sourceLikeCount: number }) => i.sourceLikeCount)).toEqual([9, 8, 7, 4, 3]);
  });

  it('narrows insights to one learning style when categoryId is given', async () => {
    const approvedArt = await createInsight({ theoryTopicId: 'ledger-lines', categoryId: 'art', status: 'approved' });
    await createInsight({ theoryTopicId: 'ledger-lines', categoryId: 'performance', status: 'approved' });

    const res = await client().get('/api/theory/topics/ledger-lines/insights?categoryId=art');

    expect(res.status).toBe(200);
    expect(res.body.insights.map((i: { id: string }) => i.id)).toEqual([approvedArt.id]);
  });

  it('rejects an unknown categoryId filter', async () => {
    const res = await client().get('/api/theory/topics/ledger-lines/insights?categoryId=not-a-style');

    expect(res.status).toBe(400);
  });
});

describe('AI notation explanation', () => {
  describe('input validation', () => {
    it.each([
      ['missing', {}],
      ['empty', { notation: '' }],
      ['not a string', { notation: 42 }],
    ])('rejects a notation that is %s without calling the model', async (_case, body) => {
      const res = await explain(body);

      expect(res.status).toBe(400);
      expect(fakeOpenAi.prompts).toHaveLength(0);
    });
  });

  describe('guests', () => {
    it('explains a notation for a guest with an unpersonalized prompt', async () => {
      const notation = uniqueNotation('Fermata');
      fakeOpenAi.replyWith('A fermata holds a note longer than its written value.');

      const res = await explain({ notation });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        explanation: 'A fermata holds a note longer than its written value.',
        personalized: false,
        categoryIds: [],
        communityInsightCount: 0,
      });
      expect(fakeOpenAi.prompts).toHaveLength(1);
      expect(fakeOpenAi.prompts[0]).toContain(notation);
      for (const category of EXPLANATION_CATEGORIES_SEED) {
        expect(fakeOpenAi.prompts[0]).not.toContain(category.aiGuidance);
      }
    });

    it('personalizes a guest prompt with the learning styles sent in the body, ignoring unknown ones', async () => {
      const res = await explain({
        notation: uniqueNotation('Slur'),
        categoryIds: ['performance', 'not-a-style'],
      });

      expect(res.status).toBe(200);
      expect(res.body.personalized).toBe(true);
      expect(res.body.categoryIds).toEqual(['performance']);
      expect(fakeOpenAi.prompts[0]).toContain(guidanceOf('performance'));
      expect(fakeOpenAi.prompts[0]).not.toContain(guidanceOf('art'));
    });

    it('treats a request with an invalid bearer token as a guest instead of rejecting it', async () => {
      const res = await client()
        .post('/api/ai/explain-notation')
        .set('Authorization', 'Bearer not-a-real-token')
        .send({ notation: uniqueNotation('Tenuto') });

      expect(res.status).toBe(200);
      expect(res.body.personalized).toBe(false);
    });

    it('uses approved insights from every learning style when the guest has no style', async () => {
      const art = await createInsight({ theoryTopicId: 'accent', categoryId: 'art', status: 'approved' });
      const performance = await createInsight({ theoryTopicId: 'accent', categoryId: 'performance', status: 'approved' });

      const res = await explain({ notation: uniqueNotation('Accent'), theoryTopicId: 'accent' });

      expect(res.status).toBe(200);
      expect(res.body.communityInsightCount).toBe(2);
      expect(res.body.personalized).toBe(true);
      expect(fakeOpenAi.prompts[0]).toContain(art.promptSummary);
      expect(fakeOpenAi.prompts[0]).toContain(performance.promptSummary);
    });
  });

  describe('logged-in users', () => {
    it("personalizes the prompt with the user's saved learning style rather than body categoryIds", async () => {
      const user = await registerUser();
      await setLearningStyle(user, ['art']);

      const res = await explain(
        { notation: uniqueNotation('Staccato'), categoryIds: ['performance'] },
        user
      );

      expect(res.status).toBe(200);
      expect(res.body.personalized).toBe(true);
      expect(res.body.categoryIds).toEqual(['art']);
      expect(fakeOpenAi.prompts[0]).toContain(guidanceOf('art'));
      expect(fakeOpenAi.prompts[0]).not.toContain(guidanceOf('performance'));
    });

    it("injects only approved learning-table rows for the topic and the user's style", async () => {
      const user = await registerUser();
      await setLearningStyle(user, ['art']);
      const approvedA = await createInsight({ theoryTopicId: 'crescendo', categoryId: 'art', status: 'approved' });
      const approvedB = await createInsight({ theoryTopicId: 'crescendo', categoryId: 'art', status: 'approved' });
      const excluded = [
        await createInsight({ theoryTopicId: 'crescendo', categoryId: 'art', status: 'draft' }),
        await createInsight({ theoryTopicId: 'crescendo', categoryId: 'art', status: 'rejected' }),
        await createInsight({ theoryTopicId: 'diminuendo', categoryId: 'art', status: 'approved' }),
        await createInsight({ theoryTopicId: 'crescendo', categoryId: 'performance', status: 'approved' }),
      ];

      const res = await explain(
        { notation: uniqueNotation('Crescendo'), theoryTopicId: 'crescendo' },
        user
      );

      expect(res.status).toBe(200);
      expect(res.body.communityInsightCount).toBe(2);
      const prompt = fakeOpenAi.prompts[0];
      expect(prompt).toContain(approvedA.promptSummary);
      expect(prompt).toContain(approvedB.promptSummary);
      for (const insight of excluded) {
        expect(prompt).not.toContain(insight.promptSummary);
      }
    });
  });

  describe('caching', () => {
    it('serves an identical request from cache without calling the model again', async () => {
      const notation = uniqueNotation('Legato');
      fakeOpenAi.replyWith('First explanation');
      const first = await explain({ notation });

      fakeOpenAi.replyWith('Second explanation');
      const second = await explain({ notation });

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(second.body.explanation).toBe('First explanation');
      expect(fakeOpenAi.prompts).toHaveLength(1);
    });

    it('calls the model again when the same notation is asked with a different learning style', async () => {
      const notation = uniqueNotation('Phrase Mark');
      fakeOpenAi.replyWith('Plain explanation');
      await explain({ notation });

      fakeOpenAi.replyWith('Art explanation');
      const styled = await explain({ notation, categoryIds: ['art'] });

      expect(styled.status).toBe(200);
      expect(styled.body.explanation).toBe('Art explanation');
      expect(fakeOpenAi.prompts).toHaveLength(2);
      expect(fakeOpenAi.prompts[1]).toContain(guidanceOf('art'));
    });

    it('stops serving a cached explanation once a new insight is approved for the topic', async () => {
      const notation = uniqueNotation('Coda');
      fakeOpenAi.replyWith('Explanation without insights');
      const before = await explain({ notation, theoryTopicId: 'coda' });
      expect(before.body.communityInsightCount).toBe(0);

      const approved = await createInsight({ theoryTopicId: 'coda', categoryId: 'art', status: 'approved' });
      fakeOpenAi.replyWith('Explanation with the new insight');
      const after = await explain({ notation, theoryTopicId: 'coda' });

      expect(after.status).toBe(200);
      expect(after.body.explanation).toBe('Explanation with the new insight');
      expect(after.body.communityInsightCount).toBe(1);
      expect(fakeOpenAi.prompts).toHaveLength(2);
      expect(fakeOpenAi.prompts[1]).toContain(approved.promptSummary);
    });

    it('calls the model again once a cached explanation is more than an hour old', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-03-01T10:00:00Z'));
      const notation = uniqueNotation('Sforzando');
      fakeOpenAi.replyWith('Morning explanation');
      await explain({ notation });

      vi.setSystemTime(new Date('2026-03-01T11:01:00Z'));
      fakeOpenAi.replyWith('Later explanation');
      const later = await explain({ notation });

      expect(later.status).toBe(200);
      expect(later.body.explanation).toBe('Later explanation');
      expect(fakeOpenAi.prompts).toHaveLength(2);
    });
  });

  describe('model failures', () => {
    it('returns 500 without leaking provider details, and does not cache the failure', async () => {
      const notation = uniqueNotation('Repeat Sign');
      fakeOpenAi.failWith(new Error('upstream provider secret detail'));

      const failed = await explain({ notation });

      expect(failed.status).toBe(500);
      expect(typeof failed.body.error).toBe('string');
      expect(failed.body.error).not.toContain('upstream provider secret detail');
      expect(failed.body.explanation).toBeUndefined();

      fakeOpenAi.replyWith('Recovered explanation');
      const retried = await explain({ notation });

      expect(retried.status).toBe(200);
      expect(retried.body.explanation).toBe('Recovered explanation');
    });
  });

  describe('rate limiting', () => {
    const AI_REQUEST_LIMIT = 15;

    it('throttles a guest IP after the AI request limit without calling the model', async () => {
      const guest = client('203.0.113.50');
      const notation = uniqueNotation('Dal Segno');
      for (let i = 0; i < AI_REQUEST_LIMIT; i += 1) {
        const res = await guest.post('/api/ai/explain-notation').send({ notation: `${notation} ${i}` });
        expect(res.status).toBe(200);
      }
      const callsBeforeLimit = fakeOpenAi.prompts.length;

      const throttled = await guest.post('/api/ai/explain-notation').send({ notation: `${notation} over` });

      expect(throttled.status).toBe(429);
      expect(fakeOpenAi.prompts.length).toBe(callsBeforeLimit);

      const otherGuest = await explain({ notation: `${notation} other ip` });
      expect(otherGuest.status).toBe(200);
    });

    it('throttles a logged-in user even when requests come from different IPs', async () => {
      const user = await registerUser();
      const notation = uniqueNotation('Dal Capo');
      for (let i = 0; i < AI_REQUEST_LIMIT; i += 1) {
        const res = await explain({ notation: `${notation} ${i}` }, user);
        expect(res.status).toBe(200);
      }
      const callsBeforeLimit = fakeOpenAi.prompts.length;

      // explain() sends every request from a fresh IP, so only the user identity is shared.
      const throttled = await explain({ notation: `${notation} over` }, user);

      expect(throttled.status).toBe(429);
      expect(fakeOpenAi.prompts.length).toBe(callsBeforeLimit);
    });
  });
});
