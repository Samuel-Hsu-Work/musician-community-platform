/**
 * Starts one throwaway PostgreSQL server for the whole test run (real Postgres
 * binaries via embedded-postgres — no Docker or local install needed), applies the
 * Prisma migrations and seed to a template database, and hands the connection info
 * to test files. Each test file then clones the template (see isolatedDatabase.ts).
 */
import { execSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';
import type { TestProject } from 'vitest/node';

export const TEMPLATE_DATABASE = 'musictalks_template';
const DB_USER = 'postgres';
const DB_PASSWORD = 'postgres';

declare module 'vitest' {
  export interface ProvidedContext {
    postgresAdminUrl: string;
    postgresBaseUrl: string;
  }
}

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, () => {
      const address = server.address();
      server.close(() => {
        if (address && typeof address === 'object') resolve(address.port);
        else reject(new Error('Could not allocate a port'));
      });
    });
  });
}

/** Environment for child processes that must never pick up values from backend/.env. */
export function isolatedEnv(databaseUrl: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    DATABASE_URL: databaseUrl,
    NODE_ENV: 'test',
    OPENAI_API_KEY: '',
    SENTRY_DSN: '',
    LOGTAIL_SOURCE_TOKEN: '',
    ADMIN_SEED_PASSWORD: '',
    ADMIN_SEED_EMAIL: '',
    ADMIN_EMAIL: '',
  };
}

const DATA_DIR_PREFIX = 'musictalks-pg-';
const OWNER_PID_FILE = 'owner.pid';

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM means the process exists but belongs to someone else.
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

/**
 * On Windows the data dir can stay locked for a while after Postgres stops, so a
 * run's own cleanup sometimes fails. Sweep leftovers from earlier runs instead,
 * skipping any directory whose owning test process is still running (concurrent
 * runs, long-lived watch mode).
 */
function removeStaleDataDirs() {
  for (const entry of readdirSync(tmpdir())) {
    if (!entry.startsWith(DATA_DIR_PREFIX)) continue;
    const fullPath = path.join(tmpdir(), entry);
    try {
      const ownerPid = Number(readFileSync(path.join(fullPath, OWNER_PID_FILE), 'utf8'));
      if (Number.isInteger(ownerPid) && ownerPid > 0 && isProcessAlive(ownerPid)) continue;
    } catch {
      // No marker: a leftover from a crashed or very early run.
    }
    try {
      rmSync(fullPath, { recursive: true, force: true });
    } catch {
      // Still locked; try again next run.
    }
  }
}

export default async function setup(project: TestProject) {
  removeStaleDataDirs();
  const port = await findFreePort();
  const runDir = mkdtempSync(path.join(tmpdir(), DATA_DIR_PREFIX));
  writeFileSync(path.join(runDir, OWNER_PID_FILE), String(process.pid));
  // initdb requires an empty directory, so the cluster lives one level down.
  const dataDir = path.join(runDir, 'data');
  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    port,
    user: DB_USER,
    password: DB_PASSWORD,
    persistent: false,
    // Without these, initdb on Windows inherits the OS code page (e.g. WIN1252),
    // which cannot store the UTF-8 text in the seed data.
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
    onLog: () => {},
  });

  const teardown = async () => {
    await pg.stop().catch(() => {});
    // Windows can keep the data files locked briefly after Postgres exits.
    // Leftovers are swept by removeStaleDataDirs() on a later run.
    try {
      rmSync(runDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    } catch {
      // Intentionally ignored.
    }
  };

  try {
    await pg.initialise();
    await pg.start();
    await pg.createDatabase(TEMPLATE_DATABASE);

    const baseUrl = `postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:${port}`;
    const templateUrl = `${baseUrl}/${TEMPLATE_DATABASE}`;
    const backendRoot = path.resolve(__dirname, '../..');

    runOrExplain('npx prisma migrate deploy', backendRoot, templateUrl);
    runOrExplain('npx tsx prisma/seed.ts', backendRoot, templateUrl);

    project.provide('postgresBaseUrl', baseUrl);
    project.provide('postgresAdminUrl', `${baseUrl}/postgres`);
  } catch (error) {
    await teardown();
    throw error;
  }

  return teardown;
}

function runOrExplain(command: string, cwd: string, databaseUrl: string) {
  try {
    execSync(command, { cwd, env: isolatedEnv(databaseUrl), stdio: 'pipe' });
  } catch (error) {
    const stderr = (error as { stderr?: Buffer }).stderr?.toString() ?? '';
    throw new Error(`Test database setup failed running "${command}":\n${stderr}`);
  }
}
