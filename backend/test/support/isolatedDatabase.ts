/**
 * Runs before every test file (vitest setupFiles). Clones the migrated + seeded
 * template into a database owned by this file and points the app at it, so test
 * files never share rows and never touch the developer's real DATABASE_URL.
 *
 * Environment variables are assigned explicitly (even to empty strings) because
 * dotenv never overrides keys that already exist — this keeps backend/.env values
 * such as OPENAI_API_KEY or SENTRY_DSN from leaking into tests.
 */
import { randomUUID } from 'node:crypto';
import { afterAll, inject, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';

// Never load backend/.env in tests: the app calls dotenv.config(), and any key not
// set below (rate-limit tunables, log level, future settings) would otherwise come
// from the developer's real environment file.
vi.mock('dotenv', () => {
  const config = () => ({ parsed: {} });
  return { default: { config }, config };
});

// OpenAI is external, paid and nondeterministic: every test file talks to the
// scripted fake, even one that sets OPENAI_API_KEY and forgets to mock it.
vi.mock('@ai-sdk/openai', () => import('./fakeOpenAi'));

const TEMPLATE_DATABASE = 'musictalks_template';
const databaseName = `test_${randomUUID().replace(/-/g, '')}`;

const adminClient = new PrismaClient({
  datasources: { db: { url: inject('postgresAdminUrl') } },
});
await adminClient.$executeRawUnsafe(
  `CREATE DATABASE "${databaseName}" TEMPLATE "${TEMPLATE_DATABASE}"`
);

Object.assign(process.env, {
  DATABASE_URL: `${inject('postgresBaseUrl')}/${databaseName}`,
  NODE_ENV: 'test',
  JWT_SECRET: 'test-jwt-secret',
  JWT_EXPIRES_IN: '7d',
  CRON_SECRET: 'test-cron-secret',
  FRONTEND_URL: 'http://localhost:3000',
  OPENAI_API_KEY: '',
  SENTRY_DSN: '',
  LOGTAIL_SOURCE_TOKEN: '',
  ADMIN_SEED_EMAIL: '',
  ADMIN_SEED_PASSWORD: '',
  ADMIN_EMAIL: '',
  FORUM_INSIGHT_MIN_LIKES: '3',
});

afterAll(async () => {
  const { default: prisma } = await import('../../src/config/database');
  await prisma.$disconnect();
  await adminClient.$executeRawUnsafe(
    `DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`
  );
  await adminClient.$disconnect();
});
