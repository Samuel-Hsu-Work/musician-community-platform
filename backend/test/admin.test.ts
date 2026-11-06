import type { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  bearer,
  client,
  prisma,
  registerAdmin,
  registerUser,
  uniqueUsername,
  type RegisteredUser,
} from './support/api';

type HttpMethod = 'get' | 'post' | 'patch';

let arrangedTopicCount = 0;

/**
 * Inserts a forum topic directly, for states the public API cannot produce
 * (hidden topics, exact creation instants). Defaults to a visible community post.
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

function asAdmin(admin: RegisteredUser) {
  const http = client();
  return {
    get: (url: string) => http.get(url).set(...bearer(admin)),
    patch: (url: string, body: Record<string, unknown>) =>
      http.patch(url).set(...bearer(admin)).send(body),
  };
}

function ids(rows: Array<{ id: string }>) {
  return rows.map((row) => row.id);
}

async function roleOf(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  return user.role;
}

async function definitionOf(topicId: string) {
  return prisma.notationDefinition.findUnique({ where: { id: topicId } });
}

/** Logs in again so the returned token reflects the user's current state. */
async function loginAgain(user: RegisteredUser): Promise<RegisteredUser> {
  const res = await client()
    .post('/api/auth/login')
    .send({ username: user.username, password: user.password });
  expect(res.status).toBe(200);
  return { ...user, token: res.body.token };
}

describe('admin access control', () => {
  const EVERY_ADMIN_ROUTE: Array<[HttpMethod, string, Record<string, unknown>?]> = [
    ['get', '/api/admin/me'],
    ['post', '/api/admin/forum-insights/run'],
    ['get', '/api/admin/insights'],
    ['get', '/api/admin/insights/learning-table'],
    ['get', '/api/admin/insights/learning-table/matrix'],
    ['patch', '/api/admin/insights/any-insight-id', { status: 'approved' }],
    ['get', '/api/admin/forum/topics'],
    ['patch', '/api/admin/forum/topics/any-topic-id', { hidden: true }],
    ['get', '/api/admin/users'],
    ['patch', '/api/admin/users/any-user-id', { role: 'admin' }],
    ['get', '/api/admin/theory/topics'],
    ['get', '/api/admin/theory/topics/staff'],
    ['patch', '/api/admin/theory/topics/staff', { standardDefinition: 'Overwritten' }],
  ];

  it.each(EVERY_ADMIN_ROUTE)('rejects a guest on %s %s with 401', async (method, url, body) => {
    const res = await client()[method](url).send(body ?? {});

    expect(res.status).toBe(401);
  });

  it.each(EVERY_ADMIN_ROUTE)(
    'rejects a regular user on %s %s with 403',
    async (method, url, body) => {
      const user = await registerUser();

      const res = await client()[method](url).set(...bearer(user)).send(body ?? {});

      expect(res.status).toBe(403);
    }
  );

  it('leaves data untouched when a regular user attempts admin mutations', async () => {
    const user = await registerUser();
    const topic = await arrangeTopic();
    const definitionBefore = await definitionOf('staff');

    const promoteSelf = await client()
      .patch(`/api/admin/users/${user.id}`)
      .set(...bearer(user))
      .send({ role: 'admin' });
    const hideTopic = await client()
      .patch(`/api/admin/forum/topics/${topic.id}`)
      .set(...bearer(user))
      .send({ hidden: true });
    const editDefinition = await client()
      .patch('/api/admin/theory/topics/staff')
      .set(...bearer(user))
      .send({ standardDefinition: 'Vandalised definition' });

    expect([promoteSelf.status, hideTopic.status, editDefinition.status]).toEqual([
      403, 403, 403,
    ]);
    expect(await roleOf(user.id)).toBe('user');
    expect((await prisma.topic.findUniqueOrThrow({ where: { id: topic.id } })).hidden).toBe(
      false
    );
    expect(await definitionOf('staff')).toEqual(definitionBefore);
  });

  it('identifies the signed-in admin on GET /admin/me', async () => {
    const admin = await registerAdmin();

    const res = await asAdmin(admin).get('/api/admin/me');

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      userId: admin.id,
      username: admin.username,
      role: 'admin',
    });
  });
});

describe('forum moderation', () => {
  let admin: RegisteredUser;

  beforeEach(async () => {
    await prisma.topic.deleteMany();
    admin = await registerAdmin();
  });

  function listAdminTopics(query = '') {
    return asAdmin(admin).get(`/api/admin/forum/topics?${query}`);
  }

  it('lists hidden and visible topics newest first, with moderation details', async () => {
    const author = await registerUser();
    const liker = await registerUser();
    const older = await arrangeTopic({
      createdAt: new Date('2026-01-01T00:00:00Z'),
      userId: author.id,
      authorUsername: author.username,
    });
    const newerHidden = await arrangeTopic({
      createdAt: new Date('2026-01-02T00:00:00Z'),
      hidden: true,
    });
    await prisma.topicLike.create({ data: { topicId: older.id, userId: liker.id } });
    await prisma.comment.create({
      data: { topicId: older.id, userId: liker.id, username: liker.username, text: 'Nice' },
    });

    const res = await listAdminTopics();

    expect(res.status).toBe(200);
    expect(ids(res.body.topics)).toEqual([newerHidden.id, older.id]);
    expect(res.body.topics[0]).toMatchObject({ hidden: true, likeCount: 0, commentCount: 0 });
    expect(res.body.topics[1]).toMatchObject({
      hidden: false,
      title: older.title,
      userId: author.id,
      authorUsername: author.username,
      likeCount: 1,
      commentCount: 1,
    });
    expect(res.body.pagination).toEqual({ page: 1, limit: 20, total: 2, hasMore: false });
  });

  it('filters topics by visibility', async () => {
    const visible = await arrangeTopic();
    const hidden = await arrangeTopic({ hidden: true });

    const onlyHidden = await listAdminTopics('hidden=true');
    const onlyVisible = await listAdminTopics('hidden=false');

    expect(ids(onlyHidden.body.topics)).toEqual([hidden.id]);
    expect(ids(onlyVisible.body.topics)).toEqual([visible.id]);
  });

  it('filters topics by type', async () => {
    const discussion = await arrangeTopic({ type: 'daily_discussion' });
    await arrangeTopic({ type: 'community_post' });

    const res = await listAdminTopics('type=daily_discussion');

    expect(ids(res.body.topics)).toEqual([discussion.id]);
  });

  it('searches title, content and author username case-insensitively', async () => {
    const byTitle = await arrangeTopic({ title: 'Needle in the title' });
    const byContent = await arrangeTopic({ content: 'There is a NEEDLE here' });
    const byAuthor = await arrangeTopic({ authorUsername: 'needle_author' });
    await arrangeTopic({ title: 'Unrelated', content: 'Nothing', authorUsername: 'someone' });

    const res = await listAdminTopics('search=needle');

    expect(ids(res.body.topics).sort()).toEqual(
      [byTitle.id, byContent.id, byAuthor.id].sort()
    );
  });

  it('paginates the topic list', async () => {
    const oldest = await arrangeTopic({ createdAt: new Date('2026-01-01T00:00:00Z') });
    await arrangeTopic({ createdAt: new Date('2026-01-02T00:00:00Z') });
    await arrangeTopic({ createdAt: new Date('2026-01-03T00:00:00Z') });

    const res = await listAdminTopics('page=2&limit=2');

    expect(ids(res.body.topics)).toEqual([oldest.id]);
    expect(res.body.pagination).toEqual({ page: 2, limit: 2, total: 3, hasMore: false });
  });

  it('hiding a topic removes it from the public forum list and permalink', async () => {
    const topic = await arrangeTopic();
    const listedBefore = await client().get('/api/forum/topics?type=community_post');
    expect(ids(listedBefore.body.topics)).toContain(topic.id);

    const res = await asAdmin(admin).patch(`/api/admin/forum/topics/${topic.id}`, {
      hidden: true,
    });

    expect(res.status).toBe(200);
    expect(res.body.topic).toMatchObject({ id: topic.id, hidden: true });
    const publicList = await client().get('/api/forum/topics?type=community_post');
    expect(ids(publicList.body.topics)).not.toContain(topic.id);
    expect((await client().get(`/api/forum/topics/${topic.id}`)).status).toBe(404);
  });

  it('unhiding a topic restores it to the public forum list and permalink', async () => {
    const topic = await arrangeTopic({ hidden: true });

    const res = await asAdmin(admin).patch(`/api/admin/forum/topics/${topic.id}`, {
      hidden: false,
    });

    expect(res.status).toBe(200);
    expect(res.body.topic).toMatchObject({ id: topic.id, hidden: false });
    const publicList = await client().get('/api/forum/topics?type=community_post');
    expect(ids(publicList.body.topics)).toContain(topic.id);
    expect((await client().get(`/api/forum/topics/${topic.id}`)).status).toBe(200);
  });

  it('rejects a visibility change whose hidden flag is not a boolean', async () => {
    const topic = await arrangeTopic();

    const res = await asAdmin(admin).patch(`/api/admin/forum/topics/${topic.id}`, {
      hidden: 'true',
    });

    expect(res.status).toBe(400);
    expect((await prisma.topic.findUniqueOrThrow({ where: { id: topic.id } })).hidden).toBe(
      false
    );
  });

  it('returns 404 when hiding a topic that does not exist', async () => {
    const res = await asAdmin(admin).patch('/api/admin/forum/topics/no-such-topic', {
      hidden: true,
    });

    expect(res.status).toBe(404);
  });
});

describe('user role management', () => {
  let admin: RegisteredUser;

  beforeEach(async () => {
    admin = await registerAdmin();
  });

  function listUsers(query: string) {
    return asAdmin(admin).get(`/api/admin/users?${query}`);
  }

  it('lists users newest first with role and activity counts, without password hashes', async () => {
    const marker = uniqueUsername('listed');
    const older = await registerUser({ email: `${marker}.older@example.test` });
    const newer = await registerUser({ email: `${marker}.newer@example.test` });
    await prisma.user.update({
      where: { id: older.id },
      data: { createdAt: new Date('2026-01-01T00:00:00Z') },
    });
    await prisma.user.update({
      where: { id: newer.id },
      data: { createdAt: new Date('2026-01-02T00:00:00Z'), role: 'admin' },
    });
    const topic = await arrangeTopic({ userId: older.id, authorUsername: older.username });
    await prisma.comment.create({
      data: { topicId: topic.id, userId: older.id, username: older.username, text: 'Hi' },
    });
    const storedHash = (await prisma.user.findUniqueOrThrow({ where: { id: older.id } }))
      .password;

    const res = await listUsers(`search=${marker}`);

    expect(res.status).toBe(200);
    expect(ids(res.body.users)).toEqual([newer.id, older.id]);
    expect(res.body.users[0]).toMatchObject({ role: 'admin', topicCount: 0, commentCount: 0 });
    expect(res.body.users[1]).toMatchObject({
      username: older.username,
      email: older.email,
      role: 'user',
      topicCount: 1,
      commentCount: 1,
    });
    for (const user of res.body.users) {
      expect(user).not.toHaveProperty('password');
    }
    expect(JSON.stringify(res.body)).not.toContain(storedHash);
  });

  it('searches users by username or email, case-insensitively, with pagination', async () => {
    const marker = uniqueUsername('find');
    const byUsername = await registerUser({ username: `${marker}_name` });
    const byEmail = await registerUser({ email: `${marker.toUpperCase()}@mail.test` });
    await registerUser();

    const all = await listUsers(`search=${marker.toUpperCase()}`);
    const firstPage = await listUsers(`search=${marker}&limit=1`);

    expect(ids(all.body.users).sort()).toEqual([byUsername.id, byEmail.id].sort());
    expect(firstPage.body.users).toHaveLength(1);
    expect(firstPage.body.pagination).toEqual({ page: 1, limit: 1, total: 2, hasMore: true });
  });

  it('promoting a user grants them admin access', async () => {
    const user = await registerUser();

    const res = await asAdmin(admin).patch(`/api/admin/users/${user.id}`, { role: 'admin' });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: user.id, role: 'admin' });
    expect(await roleOf(user.id)).toBe('admin');
    const promoted = await loginAgain(user);
    expect((await asAdmin(promoted).get('/api/admin/me')).status).toBe(200);
  });

  it('demoting another admin revokes their access immediately, even with the token they got as admin', async () => {
    const otherAdmin = await registerAdmin();
    const bystander = await registerUser();

    const res = await asAdmin(admin).patch(`/api/admin/users/${otherAdmin.id}`, {
      role: 'user',
    });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: otherAdmin.id, role: 'user' });
    expect(await roleOf(otherAdmin.id)).toBe('user');
    const staleMe = await asAdmin(otherAdmin).get('/api/admin/me');
    const stalePromote = await asAdmin(otherAdmin).patch(`/api/admin/users/${bystander.id}`, {
      role: 'admin',
    });
    expect(staleMe.status).toBe(403);
    expect(stalePromote.status).toBe(403);
    expect(await roleOf(bystander.id)).toBe('user');
  });

  it('refuses to let an admin remove their own admin role', async () => {
    const res = await asAdmin(admin).patch(`/api/admin/users/${admin.id}`, { role: 'user' });

    expect(res.status).toBe(400);
    expect(await roleOf(admin.id)).toBe('admin');
    expect((await asAdmin(admin).get('/api/admin/me')).status).toBe(200);
  });

  it('rejects a role other than user or admin', async () => {
    const user = await registerUser();

    const res = await asAdmin(admin).patch(`/api/admin/users/${user.id}`, {
      role: 'superadmin',
    });

    expect(res.status).toBe(400);
    expect(await roleOf(user.id)).toBe('user');
  });

  it('returns 404 when changing the role of a user that does not exist', async () => {
    const res = await asAdmin(admin).patch('/api/admin/users/no-such-user', { role: 'admin' });

    expect(res.status).toBe(404);
  });
});

describe('theory standard definitions', () => {
  let admin: RegisteredUser;

  beforeEach(async () => {
    admin = await registerAdmin();
  });

  function editTopic(topicId: string, body: Record<string, unknown>) {
    return asAdmin(admin).patch(`/api/admin/theory/topics/${topicId}`, body);
  }

  function publicDefinition(topicId: string) {
    return client().get(`/api/theory/notations/${topicId}`);
  }

  it('lists catalog topics of one domain only', async () => {
    const res = await asAdmin(admin).get('/api/admin/theory/topics?domainId=intervals');

    expect(res.status).toBe(200);
    expect(res.body.topics.length).toBeGreaterThan(0);
    expect(res.body.topics.every((topic: { domainId: string }) => topic.domainId === 'intervals')).toBe(true);
    expect(res.body.pagination.total).toBe(res.body.topics.length);
  });

  it('rejects an unknown domain filter', async () => {
    const res = await asAdmin(admin).get('/api/admin/theory/topics?domainId=no-such-domain');

    expect(res.status).toBe(400);
  });

  it('searches catalog topics by name or category case-insensitively', async () => {
    const byName = await asAdmin(admin).get('/api/admin/theory/topics?search=TREBLE%20CLEF');
    const byCategory = await asAdmin(admin).get('/api/admin/theory/topics?search=ARTICULATION');

    expect(ids(byName.body.topics)).toContain('treble-clef');
    expect(ids(byCategory.body.topics)).toEqual(expect.arrayContaining(['staccato', 'fermata']));
    expect(
      byCategory.body.topics.every((topic: { category: string }) => topic.category === 'articulation')
    ).toBe(true);
  });

  it('returns a topic with its catalog entry and stored definition', async () => {
    const stored = await prisma.notationDefinition.findUniqueOrThrow({ where: { id: 'staff' } });

    const res = await asAdmin(admin).get('/api/admin/theory/topics/staff');

    expect(res.status).toBe(200);
    expect(res.body.topic.catalog).toMatchObject({ id: 'staff', domainId: 'notation-reading' });
    expect(res.body.topic.definition).toMatchObject({
      id: 'staff',
      name: stored.name,
      category: stored.category,
      standardDefinition: stored.standardDefinition,
    });
  });

  it('returns 404 for a topic that is not in the catalog', async () => {
    const res = await asAdmin(admin).get('/api/admin/theory/topics/no-such-topic');

    expect(res.status).toBe(404);
  });

  it('saves an edited definition, trimmed, and serves it on the public notation endpoint', async () => {
    const res = await editTopic('treble-clef', {
      name: 'Treble Clef (G clef)',
      category: 'staff-clefs',
      standardDefinition: '   The G clef fixes G4 on the second line.   ',
    });

    expect(res.status).toBe(200);
    expect(res.body.topic).toMatchObject({
      id: 'treble-clef',
      name: 'Treble Clef (G clef)',
      standardDefinition: 'The G clef fixes G4 on the second line.',
    });
    const publicRes = await publicDefinition('treble-clef');
    expect(publicRes.status).toBe(200);
    expect(publicRes.body.definition).toEqual({
      id: 'treble-clef',
      name: 'Treble Clef (G clef)',
      category: 'staff-clefs',
      standardDefinition: 'The G clef fixes G4 on the second line.',
    });
  });

  it('shows the edited definition as a 160-character preview in the topic list', async () => {
    const longDefinition = `A tie joins two notes of the same pitch. ${'x'.repeat(200)}`;
    await editTopic('tie', { standardDefinition: longDefinition });

    const res = await asAdmin(admin).get('/api/admin/theory/topics?search=tie');
    const tie = res.body.topics.find((topic: { id: string }) => topic.id === 'tie');

    expect(tie).toMatchObject({
      hasDefinition: true,
      standardDefinitionPreview: longDefinition.slice(0, 160),
    });
  });

  it('falls back to the catalog name and category when they are left blank', async () => {
    const res = await editTopic('accent', {
      name: '   ',
      category: '',
      standardDefinition: 'Play the note with extra emphasis.',
    });

    expect(res.status).toBe(200);
    expect(res.body.topic).toMatchObject({ name: 'Accent', category: 'articulation' });
  });

  it('rejects an edit without a standard definition and keeps the stored one', async () => {
    const before = await definitionOf('fermata');

    const missing = await editTopic('fermata', { name: 'Fermata' });
    const blank = await editTopic('fermata', { standardDefinition: '   ' });

    expect(missing.status).toBe(400);
    expect(blank.status).toBe(400);
    expect(await definitionOf('fermata')).toEqual(before);
  });

  it('refuses to create a definition for a topic outside the catalog', async () => {
    const res = await editTopic('made-up-topic', { standardDefinition: 'Should not exist.' });

    expect(res.status).toBe(404);
    expect(await definitionOf('made-up-topic')).toBeNull();
    expect((await publicDefinition('made-up-topic')).status).toBe(404);
  });

  it('creates the definition for a catalog topic that has none stored yet', async () => {
    await prisma.notationDefinition.delete({ where: { id: 'coda' } });
    const listedBefore = await asAdmin(admin).get('/api/admin/theory/topics?search=coda');
    const detailBefore = await asAdmin(admin).get('/api/admin/theory/topics/coda');
    expect(listedBefore.body.topics.find((topic: { id: string }) => topic.id === 'coda')).toMatchObject({
      hasDefinition: false,
      standardDefinitionPreview: null,
    });
    expect(detailBefore.body.topic.definition).toBeNull();
    expect((await publicDefinition('coda')).status).toBe(404);

    const res = await editTopic('coda', { standardDefinition: 'An ending section.' });

    expect(res.status).toBe(200);
    expect((await publicDefinition('coda')).body.definition).toEqual({
      id: 'coda',
      name: 'Coda',
      category: 'navigation',
      standardDefinition: 'An ending section.',
    });
  });
});
