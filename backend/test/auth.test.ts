import jwt from 'jsonwebtoken';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  bearer,
  client,
  prisma,
  registerUser,
  uniqueUsername,
  VALID_PASSWORD,
} from './support/api';

const AUTH_ATTEMPT_LIMIT = 20;

/** Any authenticated endpoint works as a token probe; /me is the cheapest. */
function getOwnAccount(authorization?: string) {
  const req = client().get('/api/account/me');
  return authorization === undefined ? req : req.set('Authorization', authorization);
}

function registrationBody(overrides: Record<string, unknown> = {}) {
  const username = uniqueUsername();
  return { username, email: `${username}@example.test`, password: VALID_PASSWORD, ...overrides };
}

/** Same name with its last character swapped: exactly one edit away. */
function oneEditAway(username: string): string {
  const last = username.at(-1) === 'a' ? 'b' : 'a';
  return `${username.slice(0, -1)}${last}`;
}

async function userExistsWithEmail(email: string): Promise<boolean> {
  return (await prisma.user.count({ where: { email: email.toLowerCase() } })) > 0;
}

/** True when any stored account matches the username (any case) or email the request carried. */
async function accountExistsFor(body: Record<string, unknown>): Promise<boolean> {
  const matches = [];
  if (typeof body.username === 'string') {
    matches.push({ username: { equals: body.username.trim(), mode: 'insensitive' as const } });
  }
  if (typeof body.email === 'string') {
    matches.push({ email: body.email.trim().toLowerCase() });
  }
  return (await prisma.user.count({ where: { OR: matches } })) > 0;
}

describe('registration', () => {
  it('creates an account whose token authenticates as that user', async () => {
    const body = registrationBody();

    const res = await client().post('/api/auth/register').send(body);

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ username: body.username, email: body.email, role: 'user' });
    expect(res.body.user).not.toHaveProperty('password');
    const me = await getOwnAccount(`Bearer ${res.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.user).toMatchObject({ id: res.body.user.id, username: body.username });
  });

  it('never stores the password in plain text', async () => {
    const user = await registerUser();

    const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });

    expect(stored.password).not.toBe(user.password);
    expect(stored.password).not.toContain(user.password);
  });

  it('ignores a role supplied at sign-up, so nobody can register as an admin', async () => {
    const body = registrationBody({ role: 'admin' });

    const res = await client().post('/api/auth/register').send(body);

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('user');
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: res.body.user.id } });
    expect(stored.role).toBe('user');
  });

  it('stores emails lower-cased and trimmed', async () => {
    const username = uniqueUsername();

    const res = await client()
      .post('/api/auth/register')
      .send(registrationBody({ username, email: `  ${username.toUpperCase()}@Example.TEST ` }));

    expect(res.status).toBe(201);
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: res.body.user.id } });
    expect(stored.email).toBe(`${username}@example.test`);
  });

  it('keeps the timezone given at sign-up and falls back to UTC for an unknown one', async () => {
    const withValidZone = await registerUser({ timezone: 'Asia/Taipei' });
    const withBogusZone = await registerUser({ timezone: 'Mars/Olympus_Mons' });

    const validMe = await getOwnAccount(bearer(withValidZone)[1]);
    const bogusMe = await getOwnAccount(bearer(withBogusZone)[1]);

    expect(validMe.body.preferences.timezone).toBe('Asia/Taipei');
    expect(bogusMe.body.preferences.timezone).toBe('UTC');
  });

  it.each([
    { reason: 'missing username', overrides: { username: undefined }, mentions: /username/i },
    { reason: 'missing email', overrides: { email: undefined }, mentions: /email/i },
    { reason: 'missing password', overrides: { password: undefined }, mentions: /password/i },
    { reason: 'username too short', overrides: { username: 'ab' }, mentions: /username/i },
    { reason: 'username with illegal characters', overrides: { username: 'bad name!' }, mentions: /username/i },
    { reason: 'username longer than 30 characters', overrides: { username: 'a'.repeat(31) }, mentions: /username/i },
    { reason: 'malformed email', overrides: { email: 'not-an-email' }, mentions: /email/i },
    { reason: 'password shorter than 8 characters', overrides: { password: 'abc1234' }, mentions: /password/i },
    { reason: 'password longer than 128 characters', overrides: { password: `a1${'x'.repeat(127)}` }, mentions: /password/i },
    { reason: 'password without a digit', overrides: { password: 'abcdefghij' }, mentions: /password/i },
    { reason: 'password without a letter', overrides: { password: '1234567890' }, mentions: /password/i },
  ])('rejects $reason with 400 and creates no account', async ({ overrides, mentions }) => {
    const body = registrationBody(overrides);

    const res = await client().post('/api/auth/register').send(body);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(mentions);
    expect(await accountExistsFor(body)).toBe(false);
  });

  it('rejects a reserved username regardless of case', async () => {
    const body = registrationBody({ username: 'Admin' });

    const res = await client().post('/api/auth/register').send(body);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/reserved/i);
    expect(await userExistsWithEmail(body.email as string)).toBe(false);
  });

  it('rejects an email that is already registered, ignoring case, as a 409 on the email field', async () => {
    const existing = await registerUser();
    const body = registrationBody({ email: existing.email.toUpperCase() });

    const res = await client().post('/api/auth/register').send(body);

    expect(res.status).toBe(409);
    expect(res.body.field).toBe('email');
    expect(await prisma.user.count({ where: { username: body.username as string } })).toBe(0);
  });

  it('rejects a username that is already taken, ignoring case, as a 409 on the username field', async () => {
    const existing = await registerUser();
    const body = registrationBody({ username: existing.username.toUpperCase() });

    const res = await client().post('/api/auth/register').send(body);

    expect(res.status).toBe(409);
    expect(res.body.field).toBe('username');
    expect(await userExistsWithEmail(body.email as string)).toBe(false);
  });

  it('rejects a username one edit away from an existing one as a 409 on the username field', async () => {
    const existing = await registerUser();
    const body = registrationBody({ username: oneEditAway(existing.username) });

    const res = await client().post('/api/auth/register').send(body);

    expect(res.status).toBe(409);
    expect(res.body.field).toBe('username');
    expect(await userExistsWithEmail(body.email as string)).toBe(false);
  });

  it('rejects a username one edit away from a reserved name', async () => {
    const body = registrationBody({ username: 'admin1' });

    const res = await client().post('/api/auth/register').send(body);

    expect(res.status).toBe(409);
    expect(res.body.field).toBe('username');
    expect(await userExistsWithEmail(body.email as string)).toBe(false);
  });

  it('rejects a username under an active hold, in any case, but allows it once the hold has expired', async () => {
    const heldName = uniqueUsername('held');
    const releasedName = uniqueUsername('released');
    const day = 24 * 60 * 60 * 1000;
    await prisma.usernameHold.createMany({
      data: [
        { usernameLower: heldName, heldUntil: new Date(Date.now() + day) },
        { usernameLower: releasedName, heldUntil: new Date(Date.now() - day) },
      ],
    });
    const heldAttempt = registrationBody({ username: heldName.toUpperCase() });

    const held = await client().post('/api/auth/register').send(heldAttempt);
    const released = await client()
      .post('/api/auth/register')
      .send(registrationBody({ username: releasedName }));

    expect(held.status).toBe(409);
    expect(held.body.field).toBe('username');
    expect(await accountExistsFor(heldAttempt)).toBe(false);
    expect(released.status).toBe(201);
  });
});

describe('login', () => {
  it('logs in by username, case-insensitively, and returns a working token', async () => {
    const user = await registerUser();

    const res = await client()
      .post('/api/auth/login')
      .send({ username: user.username.toUpperCase(), password: user.password });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: user.id, username: user.username });
    expect(res.body.user).not.toHaveProperty('password');
    const me = await getOwnAccount(`Bearer ${res.body.token}`);
    expect(me.body.user.id).toBe(user.id);
  });

  it('logs in by email, case-insensitively', async () => {
    const user = await registerUser();

    const res = await client()
      .post('/api/auth/login')
      .send({ username: user.email.toUpperCase(), password: user.password });

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user.id);
  });

  it('answers a wrong password and an unknown account identically, without a token', async () => {
    const user = await registerUser();

    const wrongPassword = await client()
      .post('/api/auth/login')
      .send({ username: user.username, password: 'Different999' });
    const unknownAccount = await client()
      .post('/api/auth/login')
      .send({ username: uniqueUsername('ghost'), password: user.password });

    expect(wrongPassword.status).toBe(401);
    expect(unknownAccount.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownAccount.body);
    expect(wrongPassword.body).not.toHaveProperty('token');
  });

  it.each([
    { reason: 'no identity', body: { password: VALID_PASSWORD } },
    { reason: 'a blank identity', body: { username: '   ', password: VALID_PASSWORD } },
    { reason: 'no password', body: { username: 'someone' } },
    { reason: 'a non-string identity', body: { username: { $ne: null }, password: VALID_PASSWORD } },
  ])('rejects a login with $reason as 400', async ({ body }) => {
    const res = await client().post('/api/auth/login').send(body);

    expect(res.status).toBe(400);
    expect(res.body).not.toHaveProperty('token');
  });
});

describe('availability check', () => {
  it('rejects a request that names neither a username nor an email', async () => {
    const res = await client().post('/api/auth/check-availability').send({});

    expect(res.status).toBe(400);
  });

  it('reports an unused username and email as available', async () => {
    const username = uniqueUsername();

    const res = await client()
      .post('/api/auth/check-availability')
      .send({ username, email: `${username}@example.test` });

    expect(res.status).toBe(200);
    expect(res.body.username).toEqual({ available: true });
    expect(res.body.email).toEqual({ available: true });
  });

  it('reports only the field that was asked about', async () => {
    const res = await client()
      .post('/api/auth/check-availability')
      .send({ email: `${uniqueUsername()}@example.test` });

    expect(res.status).toBe(200);
    expect(res.body.email.available).toBe(true);
    expect(res.body).not.toHaveProperty('username');
  });

  it('reports an existing username and email as unavailable, ignoring case', async () => {
    const existing = await registerUser();

    const res = await client()
      .post('/api/auth/check-availability')
      .send({ username: existing.username.toUpperCase(), email: existing.email.toUpperCase() });

    expect(res.status).toBe(200);
    expect(res.body.username).toMatchObject({ available: false, error: expect.any(String) });
    expect(res.body.email).toMatchObject({ available: false, error: expect.any(String) });
  });

  it('reports malformed, reserved, too-similar, and held usernames as unavailable', async () => {
    const existing = await registerUser();
    const heldName = uniqueUsername('held');
    await prisma.usernameHold.create({
      data: { usernameLower: heldName, heldUntil: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    });
    const candidates = {
      malformed: 'x!',
      reserved: 'Support',
      tooSimilar: oneEditAway(existing.username),
      held: heldName.toUpperCase(),
    };

    const verdicts: Record<string, unknown> = {};
    for (const [kind, username] of Object.entries(candidates)) {
      const res = await client().post('/api/auth/check-availability').send({ username });
      verdicts[kind] = res.status === 200 ? res.body.username : `HTTP ${res.status}`;
    }

    const unavailable = { available: false, error: expect.any(String) };
    expect(verdicts).toEqual({
      malformed: unavailable,
      reserved: unavailable,
      tooSimilar: unavailable,
      held: unavailable,
    });
  });

  it('reports a malformed email as unavailable', async () => {
    const res = await client().post('/api/auth/check-availability').send({ email: 'nope@' });

    expect(res.status).toBe(200);
    expect(res.body.email).toMatchObject({ available: false, error: expect.any(String) });
  });
});

describe('token authentication', () => {
  it('rejects a request without a bearer token', async () => {
    const user = await registerUser();

    const missing = await getOwnAccount();
    const wrongScheme = await getOwnAccount(`Token ${user.token}`);

    expect(missing.status).toBe(401);
    expect(wrongScheme.status).toBe(401);
  });

  it('rejects a malformed token', async () => {
    const res = await getOwnAccount('Bearer not.a.jwt');

    expect(res.status).toBe(401);
  });

  it('rejects a token signed with a different secret', async () => {
    const user = await registerUser();
    const forged = jwt.sign({ userId: user.id, username: user.username, role: 'user' }, 'attacker-secret');

    const res = await getOwnAccount(`Bearer ${forged}`);

    expect(res.status).toBe(401);
  });

  it('rejects an unsigned token', async () => {
    const user = await registerUser();
    const unsigned = jwt.sign({ userId: user.id, username: user.username, role: 'user' }, '', {
      algorithm: 'none',
    });

    const res = await getOwnAccount(`Bearer ${unsigned}`);

    expect(res.status).toBe(401);
  });

  describe('token lifetime', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('issues tokens that keep working for 7 days and stop working afterwards', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      const issuedAt = Date.now();
      const user = await registerUser();
      const day = 24 * 60 * 60 * 1000;

      vi.setSystemTime(issuedAt + 7 * day - 60_000);
      const justBeforeExpiry = await getOwnAccount(bearer(user)[1]);
      vi.setSystemTime(issuedAt + 7 * day + 60_000);
      const justAfterExpiry = await getOwnAccount(bearer(user)[1]);

      expect(justBeforeExpiry.status).toBe(200);
      expect(justAfterExpiry.status).toBe(401);
    });
  });
});

describe('auth rate limiting', () => {
  it('blocks logins from one IP after 20 attempts, even with the right password, while other IPs are unaffected', async () => {
    const user = await registerUser();
    const attackerIp = '203.0.113.10';
    for (let attempt = 0; attempt < AUTH_ATTEMPT_LIMIT; attempt += 1) {
      const res = await client(attackerIp)
        .post('/api/auth/login')
        .send({ username: user.username, password: `Wrong${attempt}pass` });
      expect(res.status).toBe(401);
    }

    const blocked = await client(attackerIp)
      .post('/api/auth/login')
      .send({ username: user.username, password: user.password });
    const otherIp = await client('203.0.113.11')
      .post('/api/auth/login')
      .send({ username: user.username, password: user.password });

    expect(blocked.status).toBe(429);
    expect(blocked.body).not.toHaveProperty('token');
    expect(otherIp.status).toBe(200);
  });

  it('blocks registrations from one IP after 20 attempts without creating the account', async () => {
    const ip = '203.0.113.20';
    for (let attempt = 0; attempt < AUTH_ATTEMPT_LIMIT; attempt += 1) {
      const res = await client(ip).post('/api/auth/register').send(registrationBody({ password: 'short' }));
      expect(res.status).toBe(400);
    }
    const body = registrationBody();

    const blocked = await client(ip).post('/api/auth/register').send(body);

    expect(blocked.status).toBe(429);
    expect(await userExistsWithEmail(body.email as string)).toBe(false);
  });

  it('blocks availability checks from one IP after 20 attempts', async () => {
    const ip = '203.0.113.30';
    for (let attempt = 0; attempt < AUTH_ATTEMPT_LIMIT; attempt += 1) {
      const res = await client(ip)
        .post('/api/auth/check-availability')
        .send({ email: `probe${attempt}@example.test` });
      expect(res.status).toBe(200);
    }

    const blocked = await client(ip)
      .post('/api/auth/check-availability')
      .send({ email: 'one-more@example.test' });

    expect(blocked.status).toBe(429);
    expect(blocked.body).not.toHaveProperty('email');
  });
});
