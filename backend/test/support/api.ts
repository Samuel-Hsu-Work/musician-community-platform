/**
 * Shared helpers for driving the real Express app over HTTP in tests.
 *
 * Every request gets its own X-Forwarded-For address by default (the app trusts one
 * proxy hop), so the per-IP rate limiters don't throttle unrelated tests. Tests that
 * exercise rate limiting pass a fixed address explicitly via `fromIp`.
 */
import { randomBytes } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../../src/app';
import prisma from '../../src/config/database';

export const app = createApp().app;

let ipCounter = 0;
/** A client address no other request in this file has used. */
export function uniqueIp(): string {
  ipCounter += 1;
  return `10.${(ipCounter >> 16) & 255}.${(ipCounter >> 8) & 255}.${ipCounter & 255}`;
}

/** supertest agent bound to one client IP (unique unless given). */
export function client(fromIp: string = uniqueIp()) {
  const agent = request(app);
  const withIp = <T extends { set: (k: string, v: string) => T }>(req: T) =>
    req.set('X-Forwarded-For', fromIp);
  return {
    get: (url: string) => withIp(agent.get(url)),
    post: (url: string) => withIp(agent.post(url)),
    patch: (url: string) => withIp(agent.patch(url)),
    put: (url: string) => withIp(agent.put(url)),
    delete: (url: string) => withIp(agent.delete(url)),
  };
}

export interface RegisteredUser {
  id: string;
  username: string;
  email: string;
  password: string;
  token: string;
}

/** Usernames far apart in edit distance, so the "too similar" rule never trips. */
export function uniqueUsername(prefix = 'user'): string {
  return `${prefix}_${randomBytes(5).toString('hex')}`;
}

export const VALID_PASSWORD = 'Passw0rd123';

/** Registers a brand-new user through the public API and returns its credentials. */
export async function registerUser(
  overrides: Partial<{ username: string; email: string; password: string; timezone: string }> = {}
): Promise<RegisteredUser> {
  const username = overrides.username ?? uniqueUsername();
  const email = overrides.email ?? `${username}@example.test`;
  const password = overrides.password ?? VALID_PASSWORD;
  const res = await client()
    .post('/api/auth/register')
    .send({ username, email, password, timezone: overrides.timezone ?? 'UTC' });
  if (res.status !== 201) {
    throw new Error(`registerUser failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { id: res.body.user.id, username, email, password, token: res.body.token };
}

/**
 * Registers a user and promotes it to admin directly in the database (there is no
 * public API for self-promotion), then logs in again so the token carries the role.
 */
export async function registerAdmin(): Promise<RegisteredUser> {
  const user = await registerUser({ username: uniqueUsername('admin') });
  await prisma.user.update({ where: { id: user.id }, data: { role: 'admin' } });
  const res = await client()
    .post('/api/auth/login')
    .send({ username: user.username, password: user.password });
  return { ...user, token: res.body.token };
}

export function bearer(user: { token: string }): [string, string] {
  return ['Authorization', `Bearer ${user.token}`];
}

export { prisma };
