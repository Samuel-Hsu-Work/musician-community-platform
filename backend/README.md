# MusicTalks Backend API

Backend API server for MusicTalks application.

> **Design docs (project root):** [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) · [../docs/DATA_MODEL.md](../docs/DATA_MODEL.md) · [../docs/API.md](../docs/API.md)

## Tech Stack

- **Runtime**: Node.js 20 + TypeScript (`tsx` in dev, `tsc` build)
- **Framework**: Express 4
- **Database**: PostgreSQL with Prisma 5 (migrations in `prisma/migrations/`)
- **Authentication**: JWT (bcrypt password hashes), `user` / `admin` roles
- **AI**: OpenAI through the Vercel AI SDK (`ai`, `@ai-sdk/openai`)
- **Validation**: zod
- **Rate limiting**: express-rate-limit (auth and AI endpoints)
- **Observability**: Sentry, Winston + Better Stack (Logtail), correlation IDs — see [OBSERVABILITY.md](./OBSERVABILITY.md)

## Project Structure

```
backend/
├── src/
│   ├── server.ts        # App entry: CORS, observability middleware, /health, mounts /api
│   ├── routes/          # URL + middleware (auth, admin, rate limit) per area; index.ts mounts them
│   ├── controllers/     # Parse request, call a service, shape the JSON response
│   ├── services/        # Business rules and permission checks — the layer to read first
│   ├── middleware/      # auth (authenticate / optionalAuthenticate / requireAdmin), rate limits,
│   │                    #   correlation id, performance timing, error handler
│   ├── data/            # Seed sources: theory topic catalog (mirrors the frontend), standard
│   │                    #   definitions, learning-style categories
│   ├── config/          # env parsing, Prisma client, logger, Sentry
│   ├── utils/           # Pure helpers: validation, timezone, pagination, username rules
│   ├── constants/       # Shared constants (deleted-user tombstone label)
│   ├── workers/         # Unused stubs — daily topics are scheduled by ../python-worker
│   └── scripts/         # Unused stub (generateDailyContent.ts)
├── prisma/
│   ├── schema.prisma    # Source of truth for the DB shape
│   ├── migrations/      # Applied with prisma:migrate (dev) / prisma:deploy (prod)
│   └── seed.ts          # Upserts definitions + learning styles, optional admin bootstrap
└── scripts/             # One-off operator scripts, run with `npx tsx scripts/<name>.ts`
```

Request flow: `routes/` → `controllers/` → `services/` → Prisma. Put permission rules in **services**, not only in routes or controllers, so they live in one place.

Main services:

| Service | Responsibility |
|---------|----------------|
| `auth.service.ts`, `account.service.ts` | Register/login, username changes (released names are held temporarily — `username_holds`), preferences, learning style, account deletion |
| `forum.service.ts` | Topics, comments, likes, ownership rules |
| `theory.service.ts` | Standard definitions and learning-style categories |
| `ai.service.ts` | OpenAI calls and the Theory explanation prompt |
| `theoryInsight.service.ts` | Approved AI-learning-table rows used in explanation prompts |
| `forumInsightPipeline.service.ts` | Forum (likes ≥ threshold) → AI classification → AI learning table ([ADR 008](../docs/decisions/008-forum-ai-learning-pipeline.md)) |
| `admin*.service.ts` | Forum moderation, user roles, Theory definition editing |

Operator scripts in `scripts/`: `promote-admin.ts <email>`, `clear-learning-table.ts`, and `test-pipeline-prep.ts` / `test-pipeline-verify.ts` (manual pipeline checks against a dev DB — `prep` targets a hard-coded topic id).

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. **Set up database**:
   ```bash
   # Generate Prisma client
   npm run prisma:generate
   
   # Run migrations
   npm run prisma:migrate

   # Seed standard definitions + learning styles (required for Theory)
   npm run prisma:seed
   ```

4. **Run development server**:
   ```bash
   npm run dev
   ```

## Environment Variables

See `.env.example` for required environment variables.

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma client
- `npm run lint` - ESLint
- `npm run prisma:migrate` - Create/apply migrations in development
- `npm run prisma:deploy` - Apply existing migrations (production)
- `npm run prisma:push` - Push schema without a migration (prototyping only)
- `npm run prisma:seed` - Seed definitions, learning styles, optional admin
- `npm run prisma:studio` - Open Prisma Studio

- `npm test` - Run the behavior test suite once
- `npm run test:watch` - Run tests in watch mode

## Testing

Tests live in `test/` and drive the real Express app (`src/app.ts`) over HTTP with supertest against a real PostgreSQL database. No Docker or local Postgres install is needed:

- `test/support/globalSetup.ts` starts a throwaway PostgreSQL 17 server ([embedded-postgres](https://github.com/leinelissen/embedded-postgres)) on a free port, then applies `prisma/migrations` and runs `prisma/seed.ts` into a template database.
- `test/support/isolatedDatabase.ts` gives every test file its own database cloned from that template, and sets every environment variable explicitly, so `backend/.env` (your real database, OpenAI key, Sentry DSN) is never used by tests.
- `test/support/api.ts` has helpers to register users and admins and to send requests from distinct client IPs (so per-IP rate limiters don't interfere between tests).
- `test/support/fakeOpenAi.ts` replaces the external OpenAI provider with a scripted in-process model. This is the only test double; everything else (services, Prisma, the database) is real.

Conventions:

- Test behavior through the HTTP API: status codes, response bodies, and persisted state. Don't call services or utils directly, and don't mock our own code. A behavior-preserving refactor should never break a test.
- One test per behavior, named after the behavior. Add a test only when you can name the regression it catches.
- Keep tests deterministic: no sleeps or real network calls; fake only `Date` when a behavior depends on the current time.
- Bug fixes start with a failing test that reproduces the bug.

The first run downloads nothing extra (Postgres binaries ship inside the `@embedded-postgres/*` package) but takes ~30 s to initialise the server.

## API Endpoints

See [../docs/API.md](../docs/API.md) for the full reference. Route definitions live in `src/routes/`.

## Deployment

Deployed on Render: `npm install && npm run build`, then `npm run prisma:deploy`, then `npm start`. Set `FRONTEND_URL` for CORS; in production `*.vercel.app` preview origins are also allowed.
