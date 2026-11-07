import type { Prisma } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bearer, client, prisma, registerUser, type RegisteredUser } from './support/api';

const POSTS_PER_USER_PER_WINDOW = 10;

let arrangedTopicCount = 0;

/**
 * Inserts a topic directly, for states the public API cannot produce (daily
 * discussions, hidden topics, exact timestamps). Defaults to a visible community post.
 */
async function arrangeTopic(overrides: Partial<Prisma.TopicUncheckedCreateInput> = {}) {
  arrangedTopicCount += 1;
  return prisma.topic.create({
    data: {
      date: '2026-01-01',
      title: `Arranged topic ${arrangedTopicCount}`,
      content: `Arranged content ${arrangedTopicCount}`,
      type: 'community_post',
      ...overrides,
    },
  });
}

/** Topics created at strictly increasing instants and dates, returned oldest first. */
async function arrangeTopicsOldestFirst(
  count: number,
  overrides: Partial<Prisma.TopicUncheckedCreateInput> = {}
) {
  const topics = [];
  for (let day = 1; day <= count; day += 1) {
    const dayOfMonth = String(day).padStart(2, '0');
    topics.push(
      await arrangeTopic({
        date: `2026-01-${dayOfMonth}`,
        createdAt: new Date(`2026-01-${dayOfMonth}T12:00:00Z`),
        ...overrides,
      })
    );
  }
  return topics;
}

function createPost(author: RegisteredUser, body: Record<string, unknown>) {
  return client().post('/api/forum/topics').set(...bearer(author)).send(body);
}

function listTopics(query: string, viewer?: RegisteredUser) {
  const req = client().get(`/api/forum/topics?${query}`);
  return viewer ? req.set(...bearer(viewer)) : req;
}

function ids(topics: Array<{ id: string }>) {
  return topics.map((topic) => topic.id);
}

beforeEach(async () => {
  await prisma.topic.deleteMany();
});

describe('listing topics', () => {
  it('requires a valid topic type', async () => {
    const missing = await client().get('/api/forum/topics');
    const unknown = await listTopics('type=announcement');

    expect(missing.status).toBe(400);
    expect(unknown.status).toBe(400);
  });

  it('returns only topics of the requested type', async () => {
    const discussion = await arrangeTopic({ type: 'daily_discussion' });
    const post = await arrangeTopic({ type: 'community_post' });

    const discussions = await listTopics('type=daily_discussion');
    const posts = await listTopics('type=community_post');

    expect(discussions.status).toBe(200);
    expect(ids(discussions.body.topics)).toEqual([discussion.id]);
    expect(posts.status).toBe(200);
    expect(ids(posts.body.topics)).toEqual([post.id]);
  });

  it('lists topics newest first', async () => {
    const [oldest, middle, newest] = await arrangeTopicsOldestFirst(3);

    const res = await listTopics('type=community_post');

    expect(ids(res.body.topics)).toEqual([newest.id, middle.id, oldest.id]);
  });

  it('pages through results and reports total and whether more remain', async () => {
    const topics = await arrangeTopicsOldestFirst(5);
    const newestFirst = ids(topics).reverse();

    const secondPage = await listTopics('type=community_post&page=2&limit=2');
    const lastPage = await listTopics('type=community_post&page=3&limit=2');

    expect(ids(secondPage.body.topics)).toEqual(newestFirst.slice(2, 4));
    expect(secondPage.body.pagination).toEqual({ page: 2, limit: 2, total: 5, hasMore: true });
    expect(ids(lastPage.body.topics)).toEqual(newestFirst.slice(4));
    expect(lastPage.body.pagination).toEqual({ page: 3, limit: 2, total: 5, hasMore: false });
  });

  it('clamps out-of-range or malformed pagination parameters', async () => {
    await arrangeTopicsOldestFirst(2);

    const oversized = await listTopics('type=community_post&limit=500');
    const undersized = await listTopics('type=community_post&limit=0&page=-3');
    const malformed = await listTopics('type=community_post&limit=abc&page=abc');

    expect(oversized.status).toBe(200);
    expect(oversized.body.pagination).toMatchObject({ page: 1, limit: 100 });
    expect(undersized.status).toBe(200);
    expect(undersized.body.pagination).toMatchObject({ page: 1, limit: 1, total: 2, hasMore: true });
    expect(undersized.body.topics).toHaveLength(1);
    expect(malformed.status).toBe(200);
    expect(malformed.body.pagination).toMatchObject({ page: 1, limit: 20 });
  });

  it('searches title and content case-insensitively', async () => {
    const titleMatch = await arrangeTopic({ title: 'All about Tritone substitution' });
    const contentMatch = await arrangeTopic({ content: 'Try a TRITONE sub over the V chord' });
    await arrangeTopic({ title: 'Voice leading basics', content: 'Move by step' });

    const res = await listTopics('type=community_post&search=tritone');

    expect(res.status).toBe(200);
    expect(ids(res.body.topics).sort()).toEqual([titleMatch.id, contentMatch.id].sort());
    expect(res.body.pagination.total).toBe(2);
  });

  it('excludes hidden topics from lists and totals', async () => {
    const visiblePost = await arrangeTopic({ type: 'community_post' });
    await arrangeTopic({ type: 'community_post', hidden: true });
    const visibleDiscussion = await arrangeTopic({ type: 'daily_discussion' });
    await arrangeTopic({ type: 'daily_discussion', hidden: true });

    const posts = await listTopics('type=community_post');
    const discussions = await listTopics('type=daily_discussion');

    expect(ids(posts.body.topics)).toEqual([visiblePost.id]);
    expect(posts.body.pagination.total).toBe(1);
    expect(ids(discussions.body.topics)).toEqual([visibleDiscussion.id]);
    expect(discussions.body.pagination.total).toBe(1);
  });

  it('reports like counts and whether the signed-in viewer liked each post', async () => {
    const author = await registerUser();
    const liker = await registerUser();
    const likedPost = await arrangeTopic({ userId: author.id, createdAt: new Date('2026-01-02T00:00:00Z') });
    const unlikedPost = await arrangeTopic({ userId: author.id, createdAt: new Date('2026-01-01T00:00:00Z') });
    await prisma.topicLike.create({ data: { topicId: likedPost.id, userId: liker.id } });

    const asLiker = await listTopics('type=community_post', liker);
    const anonymous = await listTopics('type=community_post');

    expect(asLiker.body.topics).toEqual([
      expect.objectContaining({ id: likedPost.id, likeCount: 1, likedByUser: true }),
      expect.objectContaining({ id: unlikedPost.id, likeCount: 0, likedByUser: false }),
    ]);
    expect(anonymous.body.topics).toEqual([
      expect.objectContaining({ id: likedPost.id, likeCount: 1, likedByUser: false }),
      expect.objectContaining({ id: unlikedPost.id, likeCount: 0, likedByUser: false }),
    ]);
  });

  it('treats an invalid token as an anonymous viewer instead of rejecting the request', async () => {
    const post = await arrangeTopic();

    const res = await client()
      .get('/api/forum/topics?type=community_post')
      .set('Authorization', 'Bearer not-a-real-token');

    expect(res.status).toBe(200);
    expect(res.body.topics).toEqual([expect.objectContaining({ id: post.id, likedByUser: false })]);
  });
});

describe('reading a single topic', () => {
  it('returns a visible topic with its author', async () => {
    const author = await registerUser();
    const post = await arrangeTopic({
      userId: author.id,
      authorUsername: author.username,
      title: 'Modal interchange',
      content: 'Borrowing chords from the parallel minor',
    });

    const res = await client().get(`/api/forum/topics/${post.id}`);

    expect(res.status).toBe(200);
    expect(res.body.topic).toMatchObject({
      id: post.id,
      type: 'community_post',
      title: 'Modal interchange',
      content: 'Borrowing chords from the parallel minor',
      userId: author.id,
      authorUsername: author.username,
    });
  });

  it('reports the like count and whether the signed-in viewer liked it', async () => {
    const author = await registerUser();
    const liker = await registerUser();
    const post = await arrangeTopic({ userId: author.id });
    await prisma.topicLike.create({ data: { topicId: post.id, userId: liker.id } });

    const asLiker = await client().get(`/api/forum/topics/${post.id}`).set(...bearer(liker));
    const asAuthor = await client().get(`/api/forum/topics/${post.id}`).set(...bearer(author));
    const anonymous = await client().get(`/api/forum/topics/${post.id}`);

    expect(asLiker.body.topic).toMatchObject({ likeCount: 1, likedByUser: true });
    expect(asAuthor.body.topic).toMatchObject({ likeCount: 1, likedByUser: false });
    expect(anonymous.body.topic).toMatchObject({ likeCount: 1, likedByUser: false });
  });

  it('responds 404 for an unknown topic id', async () => {
    const res = await client().get('/api/forum/topics/does-not-exist');

    expect(res.status).toBe(404);
  });

  it('hides a hidden topic from anonymous visitors and from its own author', async () => {
    const author = await registerUser();
    const hiddenPost = await arrangeTopic({ userId: author.id, hidden: true });

    const anonymous = await client().get(`/api/forum/topics/${hiddenPost.id}`);
    const asAuthor = await client().get(`/api/forum/topics/${hiddenPost.id}`).set(...bearer(author));

    expect(anonymous.status).toBe(404);
    expect(anonymous.body).not.toHaveProperty('topic');
    expect(asAuthor.status).toBe(404);
    expect(asAuthor.body).not.toHaveProperty('topic');
  });
});

describe('latest daily discussion', () => {
  it('returns the most recently created daily discussion, ignoring newer community posts', async () => {
    await arrangeTopic({ type: 'daily_discussion', createdAt: new Date('2026-01-01T00:00:00Z') });
    const latest = await arrangeTopic({
      type: 'daily_discussion',
      createdAt: new Date('2026-01-02T00:00:00Z'),
    });
    await arrangeTopic({ type: 'community_post', createdAt: new Date('2026-01-03T00:00:00Z') });

    const res = await client().get('/api/forum/topic/latest');

    expect(res.status).toBe(200);
    expect(res.body.topic).toMatchObject({ id: latest.id, type: 'daily_discussion' });
  });

  it('skips a daily discussion that a moderator has hidden', async () => {
    const visible = await arrangeTopic({
      type: 'daily_discussion',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });
    await arrangeTopic({
      type: 'daily_discussion',
      hidden: true,
      createdAt: new Date('2026-01-02T00:00:00Z'),
    });

    const res = await client().get('/api/forum/topic/latest');

    expect(res.status).toBe(200);
    expect(res.body.topic).toMatchObject({ id: visible.id });
  });

  it('returns a null topic rather than an error when no discussion exists yet', async () => {
    await arrangeTopic({ type: 'community_post' });

    const res = await client().get('/api/forum/topic/latest');

    expect(res.status).toBe(200);
    expect(res.body.topic).toBeNull();
  });
});

describe('creating a community post', () => {
  it('stores a trimmed community post attributed to the signed-in user', async () => {
    const author = await registerUser();

    const res = await createPost(author, {
      title: '  Practising arpeggios  ',
      content: '\n Start slow with a metronome. \n',
    });

    expect(res.status).toBe(201);
    expect(res.body.topic).toMatchObject({
      title: 'Practising arpeggios',
      content: 'Start slow with a metronome.',
      type: 'community_post',
      userId: author.id,
      authorUsername: author.username,
      likeCount: 0,
      likedByUser: false,
    });
    const stored = await prisma.topic.findUniqueOrThrow({ where: { id: res.body.topic.id } });
    expect(stored).toMatchObject({
      title: 'Practising arpeggios',
      content: 'Start slow with a metronome.',
      type: 'community_post',
      hidden: false,
      userId: author.id,
      authorUsername: author.username,
    });
    const listed = await listTopics('type=community_post');
    expect(ids(listed.body.topics)).toEqual([res.body.topic.id]);
  });

  it('ignores client-supplied type and author fields, so users cannot post daily discussions or impersonate others', async () => {
    const author = await registerUser();
    const victim = await registerUser();

    const res = await createPost(author, {
      title: 'Sneaky',
      content: 'Pretending to be the system',
      type: 'daily_discussion',
      userId: victim.id,
      authorUsername: victim.username,
      hidden: true,
    });

    expect(res.status).toBe(201);
    const stored = await prisma.topic.findUniqueOrThrow({ where: { id: res.body.topic.id } });
    expect(stored).toMatchObject({
      type: 'community_post',
      userId: author.id,
      authorUsername: author.username,
      hidden: false,
    });
    const discussions = await listTopics('type=daily_discussion');
    expect(discussions.body.topics).toEqual([]);
  });

  it.each([
    ['a missing title', { content: 'Body' }],
    ['a blank title', { title: '   ', content: 'Body' }],
    ['a non-string title', { title: 42, content: 'Body' }],
    ['missing content', { title: 'Title' }],
    ['blank content', { title: 'Title', content: '\n\t ' }],
    ['a title over 200 characters', { title: 'x'.repeat(201), content: 'Body' }],
    ['content over 5000 characters', { title: 'Title', content: 'x'.repeat(5001) }],
  ])('rejects a post with %s and stores nothing', async (_case, body) => {
    const author = await registerUser();

    const res = await createPost(author, body);

    expect(res.status).toBe(400);
    expect(res.body.error).toEqual(expect.any(String));
    expect(await prisma.topic.count({ where: { userId: author.id } })).toBe(0);
  });

  it('accepts a title and content exactly at their maximum lengths', async () => {
    const author = await registerUser();

    const res = await createPost(author, { title: 't'.repeat(200), content: 'c'.repeat(5000) });

    expect(res.status).toBe(201);
    const stored = await prisma.topic.findUniqueOrThrow({ where: { id: res.body.topic.id } });
    expect(stored.title).toHaveLength(200);
    expect(stored.content).toHaveLength(5000);
  });

  describe('post date', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("dates a post by the author's own calendar day in their timezone", async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      // 12:00 UTC on 10 March is already 11 March in Kiritimati (UTC+14).
      vi.setSystemTime(new Date('2026-03-10T12:00:00Z'));
      const utcAuthor = await registerUser({ timezone: 'UTC' });
      const kiritimatiAuthor = await registerUser({ timezone: 'Pacific/Kiritimati' });

      const utcPost = await createPost(utcAuthor, { title: 'UTC', content: 'Posted at noon' });
      const kiritimatiPost = await createPost(kiritimatiAuthor, {
        title: 'Kiritimati',
        content: 'Posted at 2am tomorrow',
      });

      expect(utcPost.body.topic.date).toBe('2026-03-10');
      expect(kiritimatiPost.body.topic.date).toBe('2026-03-11');
    });
  });

  it(`throttles an account after ${POSTS_PER_USER_PER_WINDOW} posts, even when requests come from different addresses`, async () => {
    const author = await registerUser();

    for (let i = 1; i <= POSTS_PER_USER_PER_WINDOW; i += 1) {
      const res = await createPost(author, { title: `Post ${i}`, content: 'Body' });
      expect(res.status).toBe(201);
    }
    const throttled = await createPost(author, { title: 'One too many', content: 'Body' });
    const otherUser = await registerUser();
    const otherUsersPost = await createPost(otherUser, { title: 'Unaffected', content: 'Body' });

    expect(throttled.status).toBe(429);
    expect(await prisma.topic.count({ where: { userId: author.id } })).toBe(POSTS_PER_USER_PER_WINDOW);
    expect(otherUsersPost.status).toBe(201);
  });
});

describe('editing and deleting community posts', () => {
  async function arrangeOwnedPost(author: RegisteredUser) {
    return arrangeTopic({
      userId: author.id,
      authorUsername: author.username,
      title: 'Original title',
      content: 'Original content',
    });
  }

  async function expectStoredTitleAndContent(topic: { id: string; title: string; content: string }) {
    const stored = await prisma.topic.findUnique({ where: { id: topic.id } });
    expect(stored).toMatchObject({ title: topic.title, content: topic.content });
  }

  it('requires login to create, edit or delete a post', async () => {
    const author = await registerUser();
    const post = await arrangeOwnedPost(author);

    const create = await client().post('/api/forum/topics').send({ title: 'T', content: 'C' });
    const edit = await client()
      .patch(`/api/forum/topics/${post.id}`)
      .send({ title: 'Changed', content: 'Changed' });
    const remove = await client().delete(`/api/forum/topics/${post.id}`);

    expect([create.status, edit.status, remove.status]).toEqual([401, 401, 401]);
    expect(await prisma.topic.count()).toBe(1);
    await expectStoredTitleAndContent(post);
  });

  it('lets the author edit their post, storing trimmed values', async () => {
    const author = await registerUser();
    const post = await arrangeOwnedPost(author);

    const res = await client()
      .patch(`/api/forum/topics/${post.id}`)
      .set(...bearer(author))
      .send({ title: '  New title ', content: ' New content  ' });

    expect(res.status).toBe(200);
    expect(res.body.topic).toMatchObject({ id: post.id, title: 'New title', content: 'New content' });
    await expectStoredTitleAndContent({ id: post.id, title: 'New title', content: 'New content' });
  });

  it("ignores client-supplied type and owner fields on edit, so a post cannot be turned into a discussion or handed to someone else", async () => {
    const author = await registerUser();
    const otherUser = await registerUser();
    const post = await arrangeOwnedPost(author);

    const res = await client()
      .patch(`/api/forum/topics/${post.id}`)
      .set(...bearer(author))
      .send({
        title: 'New title',
        content: 'New content',
        type: 'daily_discussion',
        userId: otherUser.id,
        authorUsername: otherUser.username,
      });

    expect(res.status).toBe(200);
    const stored = await prisma.topic.findUniqueOrThrow({ where: { id: post.id } });
    expect(stored).toMatchObject({
      title: 'New title',
      type: 'community_post',
      userId: author.id,
      authorUsername: author.username,
    });
  });

  it("rejects an edit of someone else's post and leaves it unchanged", async () => {
    const author = await registerUser();
    const intruder = await registerUser();
    const post = await arrangeOwnedPost(author);

    const res = await client()
      .patch(`/api/forum/topics/${post.id}`)
      .set(...bearer(intruder))
      .send({ title: 'Hijacked', content: 'Hijacked' });

    expect(res.status).toBe(403);
    await expectStoredTitleAndContent(post);
  });

  it('rejects an edit with invalid fields and leaves the post unchanged', async () => {
    const author = await registerUser();
    const post = await arrangeOwnedPost(author);

    const blankTitle = await client()
      .patch(`/api/forum/topics/${post.id}`)
      .set(...bearer(author))
      .send({ title: '  ', content: 'New content' });
    const tooLongContent = await client()
      .patch(`/api/forum/topics/${post.id}`)
      .set(...bearer(author))
      .send({ title: 'New title', content: 'x'.repeat(5001) });

    expect(blankTitle.status).toBe(400);
    expect(tooLongContent.status).toBe(400);
    await expectStoredTitleAndContent(post);
  });

  it('lets the author delete their post, removing it and its comments', async () => {
    const author = await registerUser();
    const post = await arrangeOwnedPost(author);
    await prisma.comment.create({
      data: { topicId: post.id, userId: author.id, username: author.username, text: 'First!' },
    });

    const res = await client().delete(`/api/forum/topics/${post.id}`).set(...bearer(author));

    expect(res.status).toBe(200);
    expect(await prisma.topic.findUnique({ where: { id: post.id } })).toBeNull();
    expect(await prisma.comment.count({ where: { topicId: post.id } })).toBe(0);
    const permalink = await client().get(`/api/forum/topics/${post.id}`);
    expect(permalink.status).toBe(404);
  });

  it("rejects deleting someone else's post and keeps it", async () => {
    const author = await registerUser();
    const intruder = await registerUser();
    const post = await arrangeOwnedPost(author);

    const res = await client().delete(`/api/forum/topics/${post.id}`).set(...bearer(intruder));

    expect(res.status).toBe(403);
    await expectStoredTitleAndContent(post);
  });

  it('responds 404 when editing or deleting a post that does not exist', async () => {
    const user = await registerUser();

    const edit = await client()
      .patch('/api/forum/topics/does-not-exist')
      .set(...bearer(user))
      .send({ title: 'T', content: 'C' });
    const remove = await client().delete('/api/forum/topics/does-not-exist').set(...bearer(user));

    expect(edit.status).toBe(404);
    expect(remove.status).toBe(404);
  });

  it('does not let users edit or delete a daily discussion', async () => {
    const user = await registerUser();
    // Attributed to the user so the refusal cannot come from the ownership check alone.
    const discussion = await arrangeTopic({
      type: 'daily_discussion',
      userId: user.id,
      title: 'Daily prompt',
      content: 'What is your favourite cadence?',
    });

    const edit = await client()
      .patch(`/api/forum/topics/${discussion.id}`)
      .set(...bearer(user))
      .send({ title: 'Changed', content: 'Changed' });
    const remove = await client().delete(`/api/forum/topics/${discussion.id}`).set(...bearer(user));

    // Either "not yours" (403) or "not a community post" (400) is an acceptable refusal.
    expect([400, 403]).toContain(edit.status);
    expect([400, 403]).toContain(remove.status);
    await expectStoredTitleAndContent(discussion);
  });
});

describe('my posts', () => {
  it('requires login', async () => {
    const res = await client().get('/api/forum/topics/mine');

    expect(res.status).toBe(401);
  });

  it("returns only the caller's own community posts, newest first", async () => {
    const me = await registerUser();
    const someoneElse = await registerUser();
    const [older, newer] = await arrangeTopicsOldestFirst(2, { userId: me.id });
    await arrangeTopic({ userId: someoneElse.id });
    // Attributed to the caller so that only the type filter keeps it out of My Posts.
    await arrangeTopic({ type: 'daily_discussion', userId: me.id });

    const res = await client().get('/api/forum/topics/mine').set(...bearer(me));

    expect(res.status).toBe(200);
    expect(ids(res.body.topics)).toEqual([newer.id, older.id]);
    expect(res.body.pagination).toMatchObject({ total: 2, hasMore: false });
  });

  it("searches and pages within the caller's own posts", async () => {
    const me = await registerUser();
    const someoneElse = await registerUser();
    const [olderMatch, , newerMatch] = await arrangeTopicsOldestFirst(3, { userId: me.id });
    await prisma.topic.updateMany({
      where: { id: { in: [olderMatch.id, newerMatch.id] } },
      data: { title: 'Ear training diary' },
    });
    await arrangeTopic({ userId: someoneElse.id, title: 'Ear training for everyone' });

    const firstPage = await client().get('/api/forum/topics/mine?search=EAR&limit=1').set(...bearer(me));
    const secondPage = await client()
      .get('/api/forum/topics/mine?search=EAR&limit=1&page=2')
      .set(...bearer(me));

    expect(ids(firstPage.body.topics)).toEqual([newerMatch.id]);
    expect(firstPage.body.pagination).toEqual({ page: 1, limit: 1, total: 2, hasMore: true });
    expect(ids(secondPage.body.topics)).toEqual([olderMatch.id]);
    expect(secondPage.body.pagination).toEqual({ page: 2, limit: 1, total: 2, hasMore: false });
  });
});
