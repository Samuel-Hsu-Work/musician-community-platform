import jwt from 'jsonwebtoken';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  bearer,
  client,
  prisma,
  registerUser,
  uniqueUsername,
  VALID_PASSWORD,
  type RegisteredUser,
} from './support/api';

// Mirrors the documented tombstone label (docs/DATA_MODEL.md, docs/API.md). Kept as a
// literal so a silent change to the user-facing label is caught.
const DELETED_USER_LABEL = 'This account no longer exists';

const DAY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Local helpers. Arrange through the HTTP API; prisma only seeds legacy rows and reads persisted state.
// ---------------------------------------------------------------------------

async function fetchAccount(user: { token: string }) {
  return client().get('/api/account/me').set(...bearer(user));
}

async function changeUsername(user: { token: string }, username: unknown) {
  return client().patch('/api/account/username').set(...bearer(user)).send({ username });
}

async function deleteAccount(user: { token: string }, body: Record<string, unknown>) {
  return client().delete('/api/account').set(...bearer(user)).send(body);
}

async function createCommunityPost(author: { token: string }) {
  const res = await client()
    .post('/api/forum/topics')
    .set(...bearer(author))
    .send({ title: 'Voicing question', content: 'How do you voice a dominant 7th on guitar?' });
  expect(res.status).toBe(201);
  return res.body.topic as { id: string };
}

async function createComment(
  author: { token: string },
  topicId: string,
  text: string,
  parentId?: string
) {
  const res = await client()
    .post('/api/forum/comments')
    .set(...bearer(author))
    .send({ topicId, text, parentId });
  expect(res.status).toBe(201);
  return res.body.comment as { id: string };
}

async function fetchTopic(topicId: string) {
  const res = await client().get(`/api/forum/topics/${topicId}`);
  expect(res.status).toBe(200);
  return res.body.topic as { id: string; userId: string | null; authorUsername: string; likeCount: number };
}

type PublicComment = {
  id: string;
  userId: string | null;
  username: string;
  text: string;
  replies: PublicComment[];
};

/** All comments on a topic, replies flattened, keyed by id. */
async function fetchCommentsById(topicId: string): Promise<Map<string, PublicComment>> {
  const res = await client().get('/api/forum/comments').query({ topicId, limit: 50 });
  expect(res.status).toBe(200);
  const byId = new Map<string, PublicComment>();
  for (const comment of res.body.comments as PublicComment[]) {
    byId.set(comment.id, comment);
    for (const reply of comment.replies) byId.set(reply.id, reply);
  }
  return byId;
}

async function storedUsername(userId: string) {
  const row = await prisma.user.findUnique({ where: { id: userId } });
  return row?.username;
}

async function seededLearningStyleCategoryIds(): Promise<string[]> {
  const categories = await prisma.explanationCategory.findMany({
    orderBy: { sortOrder: 'asc' },
    select: { id: true },
  });
  return categories.map((category) => category.id);
}

async function login(user: Pick<RegisteredUser, 'username' | 'password'>) {
  return client()
    .post('/api/auth/login')
    .send({ username: user.username, password: user.password });
}

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------

describe('authentication', () => {
  const protectedEndpoints = [
    ['get', '/api/account/me'],
    ['patch', '/api/account/username'],
    ['patch', '/api/account/preferences'],
    ['patch', '/api/account/learning-style'],
    ['delete', '/api/account'],
  ] as const;

  it.each(protectedEndpoints)(
    'rejects %s %s without a valid bearer token',
    async (method, url) => {
      const anonymous = await client()[method](url).send({});
      expect(anonymous.status).toBe(401);

      // Well-formed claims for a real account, signed with the wrong secret: only
      // signature verification can reject it.
      const victim = await registerUser();
      const forgedToken = jwt.sign(
        { userId: victim.id, username: victim.username, role: 'user' },
        'not-the-server-secret'
      );
      const forged = await client()[method](url)
        .set(...bearer({ token: forgedToken }))
        .send({ password: victim.password });
      expect(forged.status).toBe(401);
      expect(await prisma.user.findUnique({ where: { id: victim.id } })).not.toBeNull();
    }
  );
});

describe('reading the account', () => {
  it('returns the profile, default preferences and an empty learning style, without the password hash', async () => {
    const user = await registerUser({ timezone: 'Asia/Taipei' });

    const res = await fetchAccount(user);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      id: user.id,
      username: user.username,
      email: user.email,
      role: 'user',
    });
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(JSON.stringify(res.body)).not.toContain(stored.password);
    expect(res.body.preferences).toMatchObject({ language: 'en', timezone: 'Asia/Taipei' });
    expect(res.body.learningStyleCategoryIds).toEqual([]);
  });
});

describe('changing the username', () => {
  it('renames the account and returns a token that acts under the new name', async () => {
    const user = await registerUser();
    const newName = uniqueUsername('renamed');

    const res = await changeUsername(user, newName);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: user.id, username: newName });
    expect(await storedUsername(user.id)).toBe(newName);

    // Content created with the returned token carries the new name.
    const renamed = { token: res.body.token as string };
    const post = await createCommunityPost(renamed);
    expect((await fetchTopic(post.id)).authorUsername).toBe(newName);

    // Logging in works with the new name only.
    expect((await login({ username: newName, password: user.password })).status).toBe(200);
    expect((await login(user)).status).toBe(401);
  });

  it('holds the previous name after a rename so nobody else can claim it, regardless of capitalization', async () => {
    const renamer = await registerUser();
    const claimant = await registerUser();
    const previousName = renamer.username;
    expect((await changeUsername(renamer, uniqueUsername('renamed'))).status).toBe(200);

    const rename = await changeUsername(claimant, previousName.toUpperCase());
    const registration = await client()
      .post('/api/auth/register')
      .send({
        username: previousName,
        email: `${uniqueUsername('claimant')}@example.test`,
        password: VALID_PASSWORD,
      });

    expect(rename.status).toBe(400);
    expect(rename.body.error).toBe('This username is not available');
    expect(registration.status).toBe(409);
    expect(await storedUsername(claimant.id)).toBe(claimant.username);
    expect(
      await prisma.user.count({ where: { username: { equals: previousName, mode: 'insensitive' } } })
    ).toBe(0);
  });

  it('lets the user switch back to their own previous name during the hold', async () => {
    const user = await registerUser();
    const previousName = user.username;
    const first = await changeUsername(user, uniqueUsername('renamed'));
    expect(first.status).toBe(200);

    const back = await changeUsername({ token: first.body.token }, previousName);

    expect(back.status).toBe(200);
    expect(await storedUsername(user.id)).toBe(previousName);
  });

  it('attributes posts and comments made with a token issued before a rename to the current name', async () => {
    // A token issued before the rename may still be in use on another device.
    const user = await registerUser();
    const newName = uniqueUsername('renamed');
    expect((await changeUsername(user, newName)).status).toBe(200);

    const post = await createCommunityPost(user);
    const comment = await createComment(user, post.id, 'Posted with the old token');

    expect((await fetchTopic(post.id)).authorUsername).toBe(newName);
    expect((await fetchCommentsById(post.id)).get(comment.id)?.username).toBe(newName);
  });

  it("shows the new name on the user's existing posts, comments and replies, leaving other authors untouched", async () => {
    const user = await registerUser();
    const other = await registerUser();
    const ownPost = await createCommunityPost(user);
    const otherPost = await createCommunityPost(other);
    const ownComment = await createComment(user, otherPost.id, 'Try drop-2 voicings');
    const otherComment = await createComment(other, otherPost.id, 'Thanks!');
    const ownReply = await createComment(user, otherPost.id, 'You are welcome', otherComment.id);
    const newName = uniqueUsername('renamed');

    const res = await changeUsername(user, newName);
    expect(res.status).toBe(200);

    expect((await fetchTopic(ownPost.id)).authorUsername).toBe(newName);
    expect((await fetchTopic(otherPost.id)).authorUsername).toBe(other.username);
    const comments = await fetchCommentsById(otherPost.id);
    expect(comments.get(ownComment.id)?.username).toBe(newName);
    expect(comments.get(ownReply.id)?.username).toBe(newName);
    expect(comments.get(otherComment.id)?.username).toBe(other.username);
  });

  it('carries legacy comments stored without an author id over to the new name', async () => {
    const user = await registerUser();
    const post = await createCommunityPost(await registerUser());
    // Legacy rows predate the userId column and are linked by username only.
    const legacy = await prisma.comment.create({
      data: { topicId: post.id, userId: null, username: user.username, text: 'Old comment' },
    });
    const newName = uniqueUsername('renamed');

    expect((await changeUsername(user, newName)).status).toBe(200);

    expect((await fetchCommentsById(post.id)).get(legacy.id)?.username).toBe(newName);
  });

  it('allows changing only the capitalization of the current name', async () => {
    const user = await registerUser();
    const recased = user.username.toUpperCase();

    const res = await changeUsername(user, recased);

    expect(res.status).toBe(200);
    expect(await storedUsername(user.id)).toBe(recased);
  });

  it.each([
    ['missing', undefined],
    ['blank', '   '],
    ['too short', 'ab'],
    ['too long', 'a'.repeat(31)],
    ['disallowed characters', 'bad name!'],
  ])('rejects an invalid username (%s) and keeps the old one', async (_case, username) => {
    const user = await registerUser();

    const res = await changeUsername(user, username);

    expect(res.status).toBe(400);
    expect(await storedUsername(user.id)).toBe(user.username);
  });

  it('rejects a reserved username', async () => {
    const user = await registerUser();

    const res = await changeUsername(user, 'Moderator');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('This username is reserved');
    expect(await storedUsername(user.id)).toBe(user.username);
  });

  it("rejects another user's name regardless of capitalization", async () => {
    const owner = await registerUser();
    const user = await registerUser();

    const res = await changeUsername(user, owner.username.toUpperCase());

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Username is already taken');
    expect(await storedUsername(user.id)).toBe(user.username);
  });

  it("rejects a name one edit away from another user's name", async () => {
    const owner = await registerUser();
    const user = await registerUser();
    const lookalike = `${owner.username}x`;

    const res = await changeUsername(user, lookalike);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Please choose a more distinct username');
    expect(await storedUsername(user.id)).toBe(user.username);
  });
});

describe('preferences', () => {
  it('saves language and timezone so they are returned with the account', async () => {
    const user = await registerUser();

    const res = await client()
      .patch('/api/account/preferences')
      .set(...bearer(user))
      .send({ language: 'zh-TW', timezone: 'America/New_York' });

    expect(res.status).toBe(200);
    expect(res.body.preferences).toMatchObject({ language: 'zh-TW', timezone: 'America/New_York' });
    expect((await fetchAccount(user)).body.preferences).toMatchObject({
      language: 'zh-TW',
      timezone: 'America/New_York',
    });
  });

  it('leaves fields that were not sent unchanged', async () => {
    const user = await registerUser({ timezone: 'Europe/Berlin' });

    await client().patch('/api/account/preferences').set(...bearer(user)).send({ language: 'ja' });
    await client()
      .patch('/api/account/preferences')
      .set(...bearer(user))
      .send({ timezone: 'Asia/Tokyo' });

    expect((await fetchAccount(user)).body.preferences).toMatchObject({
      language: 'ja',
      timezone: 'Asia/Tokyo',
    });
  });

  it.each([
    { reason: 'not a string', language: 123 },
    { reason: 'not a language tag', language: 'english please' },
    { reason: 'absurdly long', language: `en-${'x'.repeat(60)}` },
  ])('rejects a language that is $reason and keeps the stored one', async ({ language }) => {
    const user = await registerUser();
    await client().patch('/api/account/preferences').set(...bearer(user)).send({ language: 'ja' });

    const res = await client()
      .patch('/api/account/preferences')
      .set(...bearer(user))
      .send({ language });

    expect(res.status).toBe(400);
    expect((await fetchAccount(user)).body.preferences.language).toBe('ja');
  });

  it('stores UTC when the timezone is not a valid IANA zone', async () => {
    const user = await registerUser({ timezone: 'Asia/Taipei' });

    const res = await client()
      .patch('/api/account/preferences')
      .set(...bearer(user))
      .send({ timezone: 'Mars/Olympus_Mons' });

    expect(res.status).toBe(200);
    expect((await fetchAccount(user)).body.preferences.timezone).toBe('UTC');
  });
});

describe('learning style', () => {
  async function setLearningStyle(user: { token: string }, categoryIds: unknown) {
    return client()
      .patch('/api/account/learning-style')
      .set(...bearer(user))
      .send({ categoryIds });
  }

  it('replaces the previous selection with the new one', async () => {
    const [first, second] = await seededLearningStyleCategoryIds();
    const user = await registerUser();

    await setLearningStyle(user, [first]);
    const res = await setLearningStyle(user, [second]);

    expect(res.status).toBe(200);
    expect(res.body.learningStyleCategoryIds).toEqual([second]);
    expect((await fetchAccount(user)).body.learningStyleCategoryIds).toEqual([second]);
  });

  it('clears the selection when given an empty list', async () => {
    const [first] = await seededLearningStyleCategoryIds();
    const user = await registerUser();
    await setLearningStyle(user, [first]);

    const res = await setLearningStyle(user, []);

    expect(res.status).toBe(200);
    expect((await fetchAccount(user)).body.learningStyleCategoryIds).toEqual([]);
  });

  it('rejects an unknown category and keeps the previous selection', async () => {
    const [first] = await seededLearningStyleCategoryIds();
    const user = await registerUser();
    await setLearningStyle(user, [first]);

    const res = await setLearningStyle(user, ['no-such-style']);

    expect(res.status).toBe(400);
    expect((await fetchAccount(user)).body.learningStyleCategoryIds).toEqual([first]);
  });

  it.each([
    ['not an array', 'art'],
    ['missing', undefined],
    ['non-string entries', [1, 2]],
  ])('rejects malformed categoryIds (%s) and keeps the previous selection', async (_case, categoryIds) => {
    const [first] = await seededLearningStyleCategoryIds();
    const user = await registerUser();
    await setLearningStyle(user, [first]);

    const res = await setLearningStyle(user, categoryIds);

    expect(res.status).toBe(400);
    expect((await fetchAccount(user)).body.learningStyleCategoryIds).toEqual([first]);
  });
});

describe('deleting the account', () => {
  it.each([
    ['no password', {}],
    ['a wrong password', { password: 'Wrong-pass1' }],
  ])('refuses deletion with %s and keeps the account usable', async (_case, body) => {
    const user = await registerUser();

    const res = await deleteAccount(user, body);

    expect(res.status).toBe(400);
    expect((await fetchAccount(user)).status).toBe(200);
    expect((await login(user)).status).toBe(200);
  });

  it('removes the account and its personal data so neither the old token nor the credentials work', async () => {
    const [category] = await seededLearningStyleCategoryIds();
    const user = await registerUser();
    await client()
      .patch('/api/account/learning-style')
      .set(...bearer(user))
      .send({ categoryIds: [category] });

    const res = await deleteAccount(user, { password: user.password });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });

    const withOldToken = await fetchAccount(user);
    // The account is gone; 401 (token revoked) or 404 (user missing) are both acceptable.
    expect([401, 404]).toContain(withOldToken.status);
    expect(withOldToken.body.user).toBeUndefined();
    expect((await login(user)).status).toBe(401);

    expect(await prisma.user.findUnique({ where: { id: user.id } })).toBeNull();
    expect(await prisma.user.findUnique({ where: { email: user.email } })).toBeNull();
    expect(await prisma.userPreferences.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.userLearningCategory.count({ where: { userId: user.id } })).toBe(0);
  });

  it("keeps the user's posts and comments visible under the tombstone label and removes their likes", async () => {
    const user = await registerUser();
    const other = await registerUser();
    const ownPost = await createCommunityPost(user);
    const otherPost = await createCommunityPost(other);
    const ownComment = await createComment(user, otherPost.id, 'Great question');
    const otherComment = await createComment(other, otherPost.id, 'Appreciated');
    const ownReply = await createComment(user, otherPost.id, 'Any time', otherComment.id);
    const like = await client().post(`/api/forum/topics/${otherPost.id}/like`).set(...bearer(user));
    expect(like.status).toBe(200);
    expect((await fetchTopic(otherPost.id)).likeCount).toBe(1);

    expect((await deleteAccount(user, { password: user.password })).status).toBe(200);

    expect(await fetchTopic(ownPost.id)).toMatchObject({
      userId: null,
      authorUsername: DELETED_USER_LABEL,
    });
    const comments = await fetchCommentsById(otherPost.id);
    for (const id of [ownComment.id, ownReply.id]) {
      expect(comments.get(id)).toMatchObject({ userId: null, username: DELETED_USER_LABEL });
    }
    expect(comments.get(ownComment.id)?.text).toBe('Great question');
    expect(comments.get(otherComment.id)).toMatchObject({
      userId: other.id,
      username: other.username,
    });

    const otherTopic = await fetchTopic(otherPost.id);
    expect(otherTopic).toMatchObject({ userId: other.id, authorUsername: other.username });
    expect(otherTopic.likeCount).toBe(0);
  });

  it('tombstones legacy comments stored without an author id, regardless of capitalization', async () => {
    const user = await registerUser();
    const post = await createCommunityPost(await registerUser());
    const legacy = await prisma.comment.create({
      data: {
        topicId: post.id,
        userId: null,
        username: user.username.toUpperCase(),
        text: 'Old comment',
      },
    });

    expect((await deleteAccount(user, { password: user.password })).status).toBe(200);

    expect((await fetchCommentsById(post.id)).get(legacy.id)?.username).toBe(DELETED_USER_LABEL);
  });

  describe('hold on the deleted username', () => {
    it('prevents anyone from taking the deleted username by rename or registration, regardless of capitalization', async () => {
      const deleted = await registerUser();
      const claimant = await registerUser();
      expect((await deleteAccount(deleted, { password: deleted.password })).status).toBe(200);
      const recased = deleted.username.toUpperCase();

      const rename = await changeUsername(claimant, recased);
      expect(rename.status).toBe(400);
      expect(rename.body.error).toBe('This username is not available');
      expect(await storedUsername(claimant.id)).toBe(claimant.username);

      const registration = await client()
        .post('/api/auth/register')
        .send({
          username: recased,
          email: `${uniqueUsername('claimant')}@example.test`,
          password: VALID_PASSWORD,
        });
      expect(registration.status).toBe(409);
      expect(registration.body.error).toBe('This username is not available');
      expect(
        await prisma.user.count({
          where: { username: { equals: deleted.username, mode: 'insensitive' } },
        })
      ).toBe(0);
    });

    it('releases the deleted username after the 30-day hold', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      const deletedAt = new Date('2031-03-01T12:00:00Z').getTime();
      vi.setSystemTime(deletedAt);
      const deleted = await registerUser();
      expect((await deleteAccount(deleted, { password: deleted.password })).status).toBe(200);

      // Tokens are short-lived, so each claimant registers at the simulated time.
      vi.setSystemTime(deletedAt + 29 * DAY_MS);
      const earlyClaimant = await registerUser();
      const early = await changeUsername(earlyClaimant, deleted.username);
      expect(early.status).toBe(400);
      expect(early.body.error).toBe('This username is not available');

      vi.setSystemTime(deletedAt + 31 * DAY_MS);
      const lateClaimant = await registerUser();
      const res = await changeUsername(lateClaimant, deleted.username);
      expect(res.status).toBe(200);
      expect(await storedUsername(lateClaimant.id)).toBe(deleted.username);
    });
  });
});
