import { describe, expect, it } from 'vitest';
import { client, prisma, registerUser } from './support/api';

describe('test harness smoke check', () => {
  it('serves the health endpoint and talks to an isolated, seeded database', async () => {
    const res = await client().get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');

    const definitionCount = await prisma.notationDefinition.count();
    expect(definitionCount).toBeGreaterThan(100);

    const user = await registerUser();
    expect(user.token).toEqual(expect.any(String));
  });
});
