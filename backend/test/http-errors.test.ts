import { describe, expect, it } from 'vitest';
import { bearer, client, registerUser } from './support/api';

/**
 * Unexpected server errors must not echo internals (database driver messages, file
 * paths, source excerpts) to clients. A NUL byte in an id is a cheap, deterministic
 * way to make PostgreSQL reject a query from plain HTTP input.
 */
const NUL_ID = 'abc\u0000def';
const INTERNAL_DETAILS = /prisma|invalid byte|postgres|node_modules|\.ts\b|[a-z]:\\|\/src\//i;

function expectNoInternalDetails(res: { status: number; body: { error?: unknown } }) {
  expect(res.status).toBeGreaterThanOrEqual(400);
  expect(typeof res.body.error).toBe('string');
  expect(res.body.error).not.toMatch(INTERNAL_DETAILS);
}

describe('error responses', () => {
  it('does not leak internals when reading forum content fails', async () => {
    expectNoInternalDetails(await client().get(`/api/forum/topics/${encodeURIComponent(NUL_ID)}`));
    expectNoInternalDetails(
      await client().get('/api/forum/comments').query({ topicId: NUL_ID })
    );
  });

  it('does not leak internals when writing forum content fails', async () => {
    const user = await registerUser();

    expectNoInternalDetails(
      await client()
        .post('/api/forum/comments')
        .set(...bearer(user))
        .send({ topicId: NUL_ID, text: 'Hello' })
    );
    expectNoInternalDetails(
      await client()
        .post(`/api/forum/topics/${encodeURIComponent(NUL_ID)}/like`)
        .set(...bearer(user))
    );
  });

  it('does not leak internals when an AI explanation request fails', async () => {
    const res = await client()
      .post('/api/ai/explain-notation')
      .send({ notation: 'Treble Clef', theoryTopicId: NUL_ID });

    expectNoInternalDetails(res);
  });
});
