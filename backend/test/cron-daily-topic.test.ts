import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';

vi.hoisted(() => {
  process.env.OPENAI_API_KEY = 'test-key';
});

import { client, prisma, registerUser } from './support/api';
import { fakeOpenAi } from './support/fakeOpenAi';

const CRON_SECRET = 'test-cron-secret';
const FALLBACK_TITLE = 'Music Theory Learning Journey';

function postGenerateTopic(secret: string | null = CRON_SECRET) {
  const req = client().post('/api/cron/generate-topic');
  return secret === null ? req : req.set('x-cron-secret', secret);
}

async function dailyDiscussions() {
  return prisma.topic.findMany({
    where: { type: 'daily_discussion' },
    // Order by the topic's calendar date first: two topics inserted back-to-back can
    // share a createdAt millisecond, which would make createdAt-only ordering flaky.
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
  });
}

/** Pins the server clock (Date only) to an exact UTC instant. */
function freezeClockAt(isoInstant: string) {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(isoInstant));
}

beforeEach(async () => {
  fakeOpenAi.reset();
  // This file owns the daily discussions; start every test from none.
  await prisma.topic.deleteMany({ where: { type: 'daily_discussion' } });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('cron secret gate', () => {
  it.each([
    ['is missing', null],
    ['is wrong', 'not-the-secret'],
  ])('rejects topic generation when the cron secret %s and creates nothing', async (_, secret) => {
    fakeOpenAi.replyWith('Should Never Be Used\n\nBody');

    const res = await postGenerateTopic(secret);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(await dailyDiscussions()).toHaveLength(0);
    expect(fakeOpenAi.prompts).toHaveLength(0);
  });

  it.each([
    ['is missing', null],
    ['is wrong', 'not-the-secret'],
  ])('rejects forum insight processing when the cron secret %s and runs nothing', async (_, secret) => {
    // A community post liked often enough to qualify, so an unguarded run would call the AI.
    const author = await registerUser();
    const post = await prisma.topic.create({
      data: {
        date: '2026-01-01',
        title: 'Qualifying popular post',
        content: 'Why does the dominant chord resolve to the tonic?',
        type: 'community_post',
        userId: author.id,
      },
    });
    for (let i = 0; i < 3; i += 1) {
      const fan = await registerUser();
      await prisma.topicLike.create({ data: { topicId: post.id, userId: fan.id } });
    }
    const insightsBefore = await prisma.explanationCategoryInsight.count();

    const req = client().post('/api/cron/process-forum-insights');
    const res = await (secret === null ? req : req.set('x-cron-secret', secret));

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(fakeOpenAi.prompts).toHaveLength(0);
    expect(await prisma.explanationCategoryInsight.count()).toBe(insightsBefore);
  });
});

describe('daily discussion generation', () => {
  it('creates a daily discussion for the current UTC date from the AI reply', async () => {
    // Run the server in a zone where 23:30 UTC is already the next calendar day,
    // so a local-date implementation would store 2026-03-11.
    const previousTimezone = process.env.TZ;
    process.env.TZ = 'Asia/Tokyo';
    onTestFinished(() => {
      if (previousTimezone === undefined) delete process.env.TZ;
      else process.env.TZ = previousTimezone;
    });
    freezeClockAt('2026-03-10T23:30:00Z');
    expect(new Date().getDate()).toBe(11);
    fakeOpenAi.replyWith(
      'Why Do Suspended Chords Feel Unresolved?\n\nSuspended chords replace the third.\n\nWhat songs use them?'
    );

    const res = await postGenerateTopic();

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ generated: true, skipped: false });
    const stored = await dailyDiscussions();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      id: res.body.data.topic.id,
      date: '2026-03-10',
      title: 'Why Do Suspended Chords Feel Unresolved?',
      content: 'Suspended chords replace the third.\n\nWhat songs use them?',
      type: 'daily_discussion',
    });
  });

  it('publishes the generated discussion as the forum latest topic', async () => {
    fakeOpenAi.replyWith('Modes Without Tears\n\nStart from the major scale.');

    const generated = await postGenerateTopic();
    const latest = await client().get('/api/forum/topic/latest');

    expect(latest.status).toBe(200);
    expect(latest.body.topic).toMatchObject({
      id: generated.body.data.topic.id,
      title: 'Modes Without Tears',
      content: 'Start from the major scale.',
    });
  });

  it('is a no-op on a second run the same UTC day: returns the existing topic without asking the AI again', async () => {
    freezeClockAt('2026-03-10T00:00:00Z');
    fakeOpenAi.replyWith('First Topic Of The Day\n\nBody one.');
    const first = await postGenerateTopic();

    vi.setSystemTime(new Date('2026-03-10T23:59:59Z'));
    fakeOpenAi.replyWith('Second Topic Of The Day\n\nBody two.');
    const second = await postGenerateTopic();

    expect(second.status).toBe(200);
    expect(second.body.data).toMatchObject({ generated: false, skipped: true });
    expect(second.body.data.topic).toMatchObject({
      id: first.body.data.topic.id,
      title: 'First Topic Of The Day',
    });
    expect(fakeOpenAi.prompts).toHaveLength(1);
    expect(await dailyDiscussions()).toHaveLength(1);
  });

  it('generates a new discussion once the UTC date rolls over', async () => {
    freezeClockAt('2026-03-10T23:59:59Z');
    fakeOpenAi.replyWith('Tuesday Topic\n\nBody.');
    await postGenerateTopic();

    vi.setSystemTime(new Date('2026-03-11T00:00:00Z'));
    fakeOpenAi.replyWith('Wednesday Topic\n\nBody.');
    const res = await postGenerateTopic();

    expect(res.body.data).toMatchObject({ generated: true, skipped: false });
    const stored = await dailyDiscussions();
    expect(stored.map((t) => [t.date, t.title])).toEqual([
      ['2026-03-10', 'Tuesday Topic'],
      ['2026-03-11', 'Wednesday Topic'],
    ]);
  });

  it('is not suppressed by a community post dated the same day', async () => {
    freezeClockAt('2026-03-10T12:00:00Z');
    await prisma.topic.create({
      data: {
        date: '2026-03-10',
        title: 'A member post',
        content: 'Hello',
        type: 'community_post',
      },
    });
    fakeOpenAi.replyWith('Daily Topic\n\nBody.');

    const res = await postGenerateTopic();

    expect(res.body.data).toMatchObject({ generated: true });
    expect(await dailyDiscussions()).toHaveLength(1);
  });

  it('falls back to the default discussion when the AI call fails', async () => {
    fakeOpenAi.failWith(new Error('rate limited'));

    const res = await postGenerateTopic();

    expect(res.status).toBe(200);
    const stored = await dailyDiscussions();
    expect(stored).toHaveLength(1);
    expect(stored[0].title).toBe(FALLBACK_TITLE);
    expect(stored[0].content).toContain('Share your music theory learning methods');
  });
});

describe('AI reply parsing', () => {
  async function generateTopicFrom(aiReply: string) {
    fakeOpenAi.replyWith(aiReply);
    await postGenerateTopic();
    const [topic] = await dailyDiscussions();
    return topic;
  }

  it.each([
    ['a markdown heading', '## Voice Leading Basics'],
    ['a "Title:" label', 'Title: Voice Leading Basics'],
    ['bold markers', '**Voice Leading Basics**'],
    ['surrounding quotes', '"Voice Leading Basics"'],
    ['a heading with a label', '# Title: Voice Leading Basics'],
  ])('strips %s from the title', async (_, titleLine) => {
    const topic = await generateTopicFrom(`${titleLine}\n\nBody text.`);

    expect(topic.title).toBe('Voice Leading Basics');
  });

  it('takes the first non-empty line as the title, skipping leading blank lines', async () => {
    const topic = await generateTopicFrom('\n\n   \nCircle Of Fifths\n\nBody text.');

    expect(topic.title).toBe('Circle Of Fifths');
    expect(topic.content).toBe('Body text.');
  });

  it('truncates the title to its first 15 words', async () => {
    const words = Array.from({ length: 20 }, (_, i) => `word${i + 1}`);

    const topic = await generateTopicFrom(`${words.join(' ')}\n\nBody text.`);

    expect(topic.title).toBe(words.slice(0, 15).join(' '));
  });

  it('uses a default body when the AI reply has only a title line', async () => {
    const topic = await generateTopicFrom('Lonely Title');

    expect(topic.title).toBe('Lonely Title');
    expect(topic.content).toBe(
      'Share your thoughts and experiences about this music theory topic.'
    );
  });
});

describe('without an OpenAI API key configured', () => {
  it('creates the default discussion without calling the AI', async () => {
    // Boot a second app instance with no key, and keep the key empty for the whole
    // request, so the test holds whether the app reads it at boot or per request.
    const previousKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = '';
    vi.resetModules();
    const keylessApi = await import('./support/api');
    const keylessFake = (await import('./support/fakeOpenAi')).fakeOpenAi;

    try {
      const res = await keylessApi
        .client()
        .post('/api/cron/generate-topic')
        .set('x-cron-secret', CRON_SECRET);

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ generated: true });
      const stored = await dailyDiscussions();
      expect(stored).toHaveLength(1);
      // An AI call would have produced the fake's reply as the title instead.
      expect(stored[0].title).toBe(FALLBACK_TITLE);
      expect(keylessFake.prompts).toHaveLength(0);
    } finally {
      process.env.OPENAI_API_KEY = previousKey;
      await keylessApi.prisma.$disconnect();
    }
  });
});
