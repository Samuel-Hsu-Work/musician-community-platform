import { realpathSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // On Windows the shell's cwd can differ in letter case from the real path
  // (e.g. "documents" vs "Documents"), which makes test discovery find nothing.
  root: realpathSync.native(__dirname),
  test: {
    include: ['test/**/*.test.ts'],
    globalSetup: ['test/support/globalSetup.ts'],
    setupFiles: ['test/support/isolatedDatabase.ts'],
    // Each test file gets its own module registry (and so its own Prisma client and
    // in-memory state) plus its own database cloned from the migrated template.
    pool: 'forks',
    // The app logs every request; only show that output for failing tests.
    silent: 'passed-only',
    testTimeout: 30_000,
    hookTimeout: 180_000,
  },
});
