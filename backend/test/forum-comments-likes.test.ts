import { describe, expect, it } from 'vitest';
import { bearer, client, prisma, registerUser, type RegisteredUser } from './support/api';

// ---------------------------------------------------------------------------
// Local helpers. Content is created through the HTTP API wherever possible; prisma is
// used only to arrange state the API cannot produce (daily discussion topics, fixed
// timestamps for ordering) and to read persisted outcomes.
// ---------------------------------------------------------------------------

interface ListedComment {
  id: string;
  topicId: string;
  userId: string | null;
  username: string;
  text: string;
  parentId: string | null;
  likeCount: number;
  likedByUser: boolean;
  replies: ListedComment[];
}

async function createCommunityPost(author: RegisteredUser): Promise<{ id: string }> {
  const res = await client()
    .post('/api/forum/topics')
    .set(...bearer(author))
    .send({ title: 'Voicing question', content: 'How do you voice a dominant 7th chord?' });
  expect(res.status).toBe(201);
  return res.body.topic;
}

async function createDailyDiscussionTopic(): Promise<{ id: string }> {
  return prisma.topic.create({
    data: {
      date: '2026-01-15',
      title: 'Daily discussion',
      content: 'What makes a melody memorable?',
      type: 'daily_discussion',
    },
  });
}

function postComment(
  author: RegisteredUser,
  body: { topicId?: unknown; text?: unknown; parentId?: unknown }
) {
  return client().post('/api/forum/comments').set(...bearer(author)).send(body);
}

async function createComment(
  author: RegisteredUser,
  topicId: string,
  text: string,
  parentId?: string
): Promise<ListedComment> {
  const res = await postComment(author, { topicId, text, parentId });
  expect(res.status).toBe(201);
  return res.body.comment;
}

/**
 * Inserts a comment with a fixed creation time so ordering assertions never depend on
 * how fast consecutive requests happen to run.
 */
function seedCommentAt(options: {
  topicId: string;
  author: RegisteredUser;
  text: string;
  minute: number;
  parentId?: string;
}) {
  return prisma.comment.create({
    data: {
      topicId: options.topicId,
      userId: options.author.id,
      username: options.author.username,
      text: options.text,
      parentId: options.parentId ?? null,
      createdAt: new Date(Date.UTC(2026, 0, 15, 12, options.minute)),
    },
  });
}

function listComments(topicId: string, viewer?: RegisteredUser, query = '') {
  const req = client().get(`/api/forum/comments?topicId=${topicId}${query}`);
  return viewer ? req.set(...bearer(viewer)) : req;
}

function likeTopic(user: RegisteredUser, topicId: string, fromIp?: string) {
  return client(fromIp).post(`/api/forum/topics/${topicId}/like`).set(...bearer(user));
}

function likeComment(user: RegisteredUser, commentId: string) {
  return client().post(`/api/forum/comments/${commentId}/like`).set(...bearer(user));
}

// ---------------------------------------------------------------------------

describe('listing comments', () => {
  it('lets guests read top-level comments newest first, with replies nested oldest first', async () => {
    const author = await registerUser();
    const commenter = await registerUser();
    const topic = await createCommunityPost(author);

    const comment = (text: string, minute: number, parentId?: string) =>
      seedCommentAt({ topicId: topic.id, author: commenter, text, minute, parentId });
    const older = await comment('older top-level', 0);
    const newer = await comment('newer top-level', 1);
    const lateReply = await comment('late reply', 5, older.id);
    const earlyReply = await comment('early reply', 2, older.id);

    const res = await listComments(topic.id);

    expect(res.status).toBe(200);
    const comments: ListedComment[] = res.body.comments;
    expect(comments.map((c) => c.id)).toEqual([newer.id, older.id]);
    expect(comments[0].replies).toEqual([]);
    expect(comments[1].replies.map((r) => r.id)).toEqual([earlyReply.id, lateReply.id]);
    expect(comments[1].replies[0]).toMatchObject({
      parentId: older.id,
      text: 'early reply',
      username: commenter.username,
    });
    expect(res.body.totalComments).toBe(4);
    expect(res.body.pagination).toMatchObject({ page: 1, total: 2, hasMore: false });
  });

  it('paginates by top-level comment and keeps each thread whole', async () => {
    const author = await registerUser();
    const topic = await createCommunityPost(author);
    const comment = (text: string, minute: number, parentId?: string) =>
      seedCommentAt({ topicId: topic.id, author, text, minute, parentId });
    const first = await comment('first', 0);
    await comment('second', 1);
    await comment('third', 2);
    const reply = await comment('reply to first', 3, first.id);

    const res = await listComments(topic.id, undefined, '&limit=2&page=2');

    expect(res.status).toBe(200);
    expect(res.body.comments.map((c: ListedComment) => c.id)).toEqual([first.id]);
    expect(res.body.comments[0].replies.map((r: ListedComment) => r.id)).toEqual([reply.id]);
    expect(res.body.pagination).toMatchObject({ page: 2, limit: 2, total: 3, hasMore: false });
    expect(res.body.totalComments).toBe(4);
  });

  it('marks likedByUser only for the viewer who liked the comment', async () => {
    const author = await registerUser();
    const liker = await registerUser();
    const bystander = await registerUser();
    const topic = await createCommunityPost(author);
    const parent = await createComment(author, topic.id, 'top-level');
    const reply = await createComment(author, topic.id, 'reply', parent.id);
    expect((await likeComment(liker, reply.id)).status).toBe(200);

    const replyAs = async (viewer?: RegisteredUser) => {
      const res = await listComments(topic.id, viewer);
      expect(res.status).toBe(200);
      return res.body.comments[0].replies[0] as ListedComment;
    };

    expect(await replyAs(liker)).toMatchObject({ likeCount: 1, likedByUser: true });
    expect(await replyAs(bystander)).toMatchObject({ likeCount: 1, likedByUser: false });
    expect(await replyAs()).toMatchObject({ likeCount: 1, likedByUser: false });
  });

  it('requires a topicId', async () => {
    const res = await client().get('/api/forum/comments');
    expect(res.status).toBe(400);
  });
});

describe('posting comments', () => {
  it('requires authentication', async () => {
    const author = await registerUser();
    const topic = await createCommunityPost(author);

    const res = await client().post('/api/forum/comments').send({ topicId: topic.id, text: 'Hi' });

    expect(res.status).toBe(401);
    expect(await prisma.comment.count({ where: { topicId: topic.id } })).toBe(0);
  });

  it('creates a top-level comment attributed to the caller with trimmed text', async () => {
    const author = await registerUser();
    const commenter = await registerUser();
    const topic = await createCommunityPost(author);

    const res = await postComment(commenter, { topicId: topic.id, text: '  Try drop-2 voicings.  ' });

    expect(res.status).toBe(201);
    expect(res.body.comment).toMatchObject({
      topicId: topic.id,
      userId: commenter.id,
      username: commenter.username,
      text: 'Try drop-2 voicings.',
      parentId: null,
      likeCount: 0,
      likedByUser: false,
    });
    const listed = await listComments(topic.id);
    expect(listed.body.comments.map((c: ListedComment) => c.id)).toEqual([res.body.comment.id]);
  });

  it('nests a reply under its top-level parent comment', async () => {
    const author = await registerUser();
    const replier = await registerUser();
    const topic = await createCommunityPost(author);
    const parent = await createComment(author, topic.id, 'Question?');

    const res = await postComment(replier, { topicId: topic.id, text: 'Answer.', parentId: parent.id });

    expect(res.status).toBe(201);
    expect(res.body.comment.parentId).toBe(parent.id);
    const listed = await listComments(topic.id);
    expect(listed.body.comments.map((c: ListedComment) => c.id)).toEqual([parent.id]);
    expect(listed.body.comments[0].replies.map((r: ListedComment) => r.id)).toEqual([
      res.body.comment.id,
    ]);
  });

  it.each([
    ['missing', undefined],
    ['non-string', 42],
    ['empty', ''],
    ['whitespace-only', '   \n\t'],
  ])('rejects %s text', async (_label, text) => {
    const author = await registerUser();
    const topic = await createCommunityPost(author);

    const res = await postComment(author, { topicId: topic.id, text });

    expect(res.status).toBe(400);
    expect(await prisma.comment.count({ where: { topicId: topic.id } })).toBe(0);
  });

  it('accepts up to 1000 characters and rejects longer text', async () => {
    const author = await registerUser();
    const topic = await createCommunityPost(author);

    const tooLong = await postComment(author, { topicId: topic.id, text: 'a'.repeat(1001) });
    const atLimit = await postComment(author, { topicId: topic.id, text: 'a'.repeat(1000) });

    expect(tooLong.status).toBe(400);
    expect(atLimit.status).toBe(201);
    expect(await prisma.comment.count({ where: { topicId: topic.id } })).toBe(1);
  });

  it('returns 404 when the topic does not exist', async () => {
    const commenter = await registerUser();

    const res = await postComment(commenter, { topicId: 'no-such-topic', text: 'Hello' });

    expect(res.status).toBe(404);
    expect(await prisma.comment.count({ where: { userId: commenter.id } })).toBe(0);
  });

  it('rejects a reply whose parent is unknown or belongs to another topic', async () => {
    const author = await registerUser();
    const topic = await createCommunityPost(author);
    const otherTopic = await createDailyDiscussionTopic();
    const commentOnOtherTopic = await createComment(author, otherTopic.id, 'Elsewhere');

    const unknownParent = await postComment(author, {
      topicId: topic.id,
      text: 'Reply',
      parentId: 'no-such-comment',
    });
    const crossTopicParent = await postComment(author, {
      topicId: topic.id,
      text: 'Reply',
      parentId: commentOnOtherTopic.id,
    });

    expect(unknownParent.status).toBe(400);
    expect(crossTopicParent.status).toBe(400);
    expect(await prisma.comment.count({ where: { topicId: topic.id } })).toBe(0);
  });

  it('rejects a reply to a reply (threads are one level deep)', async () => {
    const author = await registerUser();
    const topic = await createCommunityPost(author);
    const parent = await createComment(author, topic.id, 'Top');
    const reply = await createComment(author, topic.id, 'Reply', parent.id);

    const res = await postComment(author, { topicId: topic.id, text: 'Nested', parentId: reply.id });

    expect(res.status).toBe(400);
    expect(await prisma.comment.count({ where: { topicId: topic.id } })).toBe(2);
  });

  it('throttles an account after 10 comments without blocking other accounts on the same IP', async () => {
    const sharedIp = '203.0.113.9';
    const topicAuthor = await registerUser();
    const spammer = await registerUser();
    const neighbour = await registerUser();
    const topic = await createCommunityPost(topicAuthor);
    const commentFrom = (user: RegisteredUser, text: string) =>
      client(sharedIp).post('/api/forum/comments').set(...bearer(user)).send({ topicId: topic.id, text });

    for (let i = 0; i < 10; i += 1) {
      expect((await commentFrom(spammer, `Spam ${i}`)).status).toBe(201);
    }
    const throttled = await commentFrom(spammer, 'One too many');
    const neighbourComment = await commentFrom(neighbour, 'Legit question');

    expect(throttled.status).toBe(429);
    expect(neighbourComment.status).toBe(201);
    expect(await prisma.comment.count({ where: { topicId: topic.id, userId: spammer.id } })).toBe(10);
    expect(await prisma.comment.count({ where: { topicId: topic.id, userId: neighbour.id } })).toBe(1);
  });
});

describe('editing comments', () => {
  it('lets the author edit their comment', async () => {
    const author = await registerUser();
    const topic = await createCommunityPost(author);
    const comment = await createComment(author, topic.id, 'Original');

    const res = await client()
      .patch(`/api/forum/comments/${comment.id}`)
      .set(...bearer(author))
      .send({ text: '  Edited  ' });

    expect(res.status).toBe(200);
    expect(res.body.comment).toMatchObject({ id: comment.id, text: 'Edited', userId: author.id });
    const stored = await prisma.comment.findUniqueOrThrow({ where: { id: comment.id } });
    expect(stored.text).toBe('Edited');
  });

  it('rejects an edit by a non-author and leaves the comment unchanged', async () => {
    const author = await registerUser();
    const intruder = await registerUser();
    const topic = await createCommunityPost(author);
    const comment = await createComment(author, topic.id, 'Original');

    const res = await client()
      .patch(`/api/forum/comments/${comment.id}`)
      .set(...bearer(intruder))
      .send({ text: 'Hijacked' });

    expect(res.status).toBe(403);
    const stored = await prisma.comment.findUniqueOrThrow({ where: { id: comment.id } });
    expect(stored).toMatchObject({ text: 'Original', userId: author.id, username: author.username });
  });

  it('rejects blank replacement text and leaves the comment unchanged', async () => {
    const author = await registerUser();
    const topic = await createCommunityPost(author);
    const comment = await createComment(author, topic.id, 'Original');

    const res = await client()
      .patch(`/api/forum/comments/${comment.id}`)
      .set(...bearer(author))
      .send({ text: '   ' });

    expect(res.status).toBe(400);
    const stored = await prisma.comment.findUniqueOrThrow({ where: { id: comment.id } });
    expect(stored.text).toBe('Original');
  });

  it('returns 404 when editing or deleting a comment that does not exist', async () => {
    const user = await registerUser();

    const edit = await client()
      .patch('/api/forum/comments/no-such-comment')
      .set(...bearer(user))
      .send({ text: 'Edit' });
    const remove = await client().delete('/api/forum/comments/no-such-comment').set(...bearer(user));

    expect(edit.status).toBe(404);
    expect(remove.status).toBe(404);
  });
});

describe('deleting comments', () => {
  it('lets the author delete their comment, removing its replies and likes with it', async () => {
    const author = await registerUser();
    const replier = await registerUser();
    const liker = await registerUser();
    const topic = await createCommunityPost(author);
    const parent = await createComment(author, topic.id, 'Parent');
    const reply = await createComment(replier, topic.id, 'Reply', parent.id);
    const sibling = await createComment(replier, topic.id, 'Unrelated top-level');
    expect((await likeComment(liker, parent.id)).status).toBe(200);
    expect((await likeComment(liker, reply.id)).status).toBe(200);

    const res = await client().delete(`/api/forum/comments/${parent.id}`).set(...bearer(author));

    expect(res.status).toBe(200);
    const remaining = await prisma.comment.findMany({ where: { topicId: topic.id } });
    expect(remaining.map((c) => c.id)).toEqual([sibling.id]);
    expect(
      await prisma.commentLike.count({ where: { commentId: { in: [parent.id, reply.id] } } })
    ).toBe(0);
    const listed = await listComments(topic.id);
    expect(listed.body.totalComments).toBe(1);
  });

  it('rejects a delete by a non-author and keeps the comment', async () => {
    const author = await registerUser();
    const intruder = await registerUser();
    const topic = await createCommunityPost(author);
    const comment = await createComment(author, topic.id, 'Keep me');

    const res = await client().delete(`/api/forum/comments/${comment.id}`).set(...bearer(intruder));

    expect(res.status).toBe(403);
    expect(await prisma.comment.findUnique({ where: { id: comment.id } })).not.toBeNull();
  });
});

describe('topic likes', () => {
  it('toggles a like on and off per user and reports the current count', async () => {
    const author = await registerUser();
    const first = await registerUser();
    const second = await registerUser();
    const topic = await createCommunityPost(author);

    const firstLike = await likeTopic(first, topic.id);
    const secondLike = await likeTopic(second, topic.id);
    const firstUnlike = await likeTopic(first, topic.id);

    expect(firstLike.status).toBe(200);
    expect(firstLike.body).toMatchObject({ likeCount: 1, likedByUser: true });
    expect(secondLike.body).toMatchObject({ likeCount: 2, likedByUser: true });
    expect(firstUnlike.body).toMatchObject({ likeCount: 1, likedByUser: false });

    const likers = await prisma.topicLike.findMany({ where: { topicId: topic.id } });
    expect(likers.map((l) => l.userId)).toEqual([second.id]);
  });

  it("rejects liking one's own post", async () => {
    const author = await registerUser();
    const topic = await createCommunityPost(author);

    const res = await likeTopic(author, topic.id);

    expect(res.status).toBe(400);
    expect(await prisma.topicLike.count({ where: { topicId: topic.id } })).toBe(0);
  });

  it('rejects liking a daily discussion topic', async () => {
    const user = await registerUser();
    const topic = await createDailyDiscussionTopic();

    const res = await likeTopic(user, topic.id);

    expect(res.status).toBe(400);
    expect(await prisma.topicLike.count({ where: { topicId: topic.id } })).toBe(0);
  });
});

describe('comment likes', () => {
  it('toggles a like on and off per user and reports the current count', async () => {
    const author = await registerUser();
    const first = await registerUser();
    const second = await registerUser();
    const topic = await createCommunityPost(author);
    const comment = await createComment(author, topic.id, 'Like me');

    const firstLike = await likeComment(first, comment.id);
    const secondLike = await likeComment(second, comment.id);
    const firstUnlike = await likeComment(first, comment.id);

    expect(firstLike.status).toBe(200);
    expect(firstLike.body).toMatchObject({ likeCount: 1, likedByUser: true });
    expect(secondLike.body).toMatchObject({ likeCount: 2, likedByUser: true });
    expect(firstUnlike.body).toMatchObject({ likeCount: 1, likedByUser: false });

    const likers = await prisma.commentLike.findMany({ where: { commentId: comment.id } });
    expect(likers.map((l) => l.userId)).toEqual([second.id]);
  });

  it("rejects liking one's own comment", async () => {
    const topicAuthor = await registerUser();
    const commenter = await registerUser();
    const topic = await createCommunityPost(topicAuthor);
    const comment = await createComment(commenter, topic.id, 'Mine');

    const res = await likeComment(commenter, comment.id);

    expect(res.status).toBe(400);
    expect(await prisma.commentLike.count({ where: { commentId: comment.id } })).toBe(0);
  });
});

describe('like access rules', () => {
  it('requires authentication to like topics or comments', async () => {
    const author = await registerUser();
    const topic = await createCommunityPost(author);
    const comment = await createComment(author, topic.id, 'Hello');

    const topicRes = await client().post(`/api/forum/topics/${topic.id}/like`);
    const commentRes = await client().post(`/api/forum/comments/${comment.id}/like`);

    expect(topicRes.status).toBe(401);
    expect(commentRes.status).toBe(401);
    expect(await prisma.topicLike.count({ where: { topicId: topic.id } })).toBe(0);
    expect(await prisma.commentLike.count({ where: { commentId: comment.id } })).toBe(0);
  });

  it('returns 404 when liking a topic or comment that does not exist', async () => {
    const user = await registerUser();

    const topicRes = await likeTopic(user, 'no-such-topic');
    const commentRes = await likeComment(user, 'no-such-comment');

    expect(topicRes.status).toBe(404);
    expect(commentRes.status).toBe(404);
    expect(await prisma.topicLike.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.commentLike.count({ where: { userId: user.id } })).toBe(0);
  });

  it('throttles an account after 30 like toggles per minute without blocking other accounts on the same IP', async () => {
    const sharedIp = '203.0.113.7';
    const author = await registerUser();
    const hammerer = await registerUser();
    const neighbour = await registerUser();
    const topic = await createCommunityPost(author);

    for (let i = 0; i < 30; i += 1) {
      expect((await likeTopic(hammerer, topic.id, sharedIp)).status).toBe(200);
    }
    // 30 toggles is an even number, so the hammerer currently does not like the post.
    const throttled = await likeTopic(hammerer, topic.id, sharedIp);
    const neighbourLike = await likeTopic(neighbour, topic.id, sharedIp);

    expect(throttled.status).toBe(429);
    expect(throttled.body.error).toEqual(expect.any(String));
    expect(neighbourLike.status).toBe(200);
    const likers = await prisma.topicLike.findMany({ where: { topicId: topic.id } });
    expect(likers.map((l) => l.userId)).toEqual([neighbour.id]);
  });
});
