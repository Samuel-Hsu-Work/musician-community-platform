# MusicTalks

A music theory learning web app with two halves that feed each other:

- **Theory** — a 6-domain curriculum (~178 topics). Each topic shows a fixed *standard definition* from the database plus an on-demand *AI explanation* tailored to the learner's chosen learning style.
- **Forum** — one AI-generated **Daily Discussion** per UTC day, plus user-written **Community** posts with comments and likes.

Highly liked Forum posts and comments are distilled by an AI pipeline into an **AI learning table**, which admins review and which then enriches future Theory AI explanations. An **Admin** area covers moderation, users, Theory content, and the learning table.

## Architecture at a glance

```
┌──────────────────────┐   HTTP (JSON, Bearer JWT)   ┌──────────────────────────────┐
│ music-talks          │────────────────────────────▶│ backend                      │
│ Next.js 16 / React 19│                             │ Express + Prisma (:3001)     │
│ (:3000)              │                             │   routes → controllers →     │
│ Forum · Theory ·     │                             │   services → PostgreSQL      │
│ Account · Admin UI   │                             │   └─ OpenAI (ai.service.ts)  │
└──────────────────────┘                             └──────────────▲───────────────┘
                                                                    │ POST /api/cron/generate-topic
                                                                    │ (x-cron-secret)
                                                          ┌─────────┴─────────┐
                                                          │ python-worker     │
                                                          │ daily, 00:00 UTC  │
                                                          └───────────────────┘
```

- **Frontend** owns presentation and the Theory topic catalog (which topics exist and how they're grouped).
- **Backend** owns auth, all persistence (Forum, standard definitions, learning styles, AI learning table), every OpenAI call, and permission rules (in `services/`).
- **Python worker** only triggers daily topic generation over HTTP; it never touches the database.
- The Forum → AI learning table pipeline is triggered by an admin from `/admin/learning`, or by any external scheduler calling `POST /api/cron/process-forum-insights`. Nothing in this repo schedules it automatically.

Full detail: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Repository layout

| Path | Role | Default port | Deployed to |
|------|------|--------------|-------------|
| [`music-talks/`](./music-talks/README.md) | Next.js frontend (App Router, Tailwind 4) | 3000 | Vercel |
| [`backend/`](./backend/README.md) | Express API, Prisma ORM, PostgreSQL, OpenAI | 3001 | Render |
| [`python-worker/`](./python-worker/README.md) | Long-running scheduler that requests one AI daily discussion per UTC day | — | Separate service (e.g. Render worker) |
| [`scripts/`](./scripts/README.md) | Offline log-analysis utilities for exported Better Stack logs — not part of the running app | — | — |
| [`docs/`](./docs/) | Architecture, data model, API reference, and design decision records (ADRs) | — | — |

Each package's own README describes its internal folder structure.

## Quick start (local)

Prerequisites: Node.js 20+, PostgreSQL, Python 3.8+ (only for the worker).

### 1. Backend + database

```bash
cd backend
cp .env.example .env        # set DATABASE_URL and JWT_SECRET at minimum
npm install
npm run prisma:generate
npm run prisma:migrate      # apply migrations to your local DB
npm run prisma:seed         # standard definitions, learning styles, optional admin
npm run dev
```

The seed is required for Theory to work: it loads the standard definition for every catalog topic and the learning-style categories. Re-run it after changing anything in `backend/src/data/`.

### 2. Frontend

```bash
cd music-talks
npm install
# optional: echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 3. Python worker (optional — daily discussion topics)

```bash
cd python-worker
python3 -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # API_URL; CRON_SECRET must match the backend's
python worker.py
```

### Becoming an admin locally

Either set `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` before seeding (creates a new admin), set `ADMIN_EMAIL` to promote an already-registered user on seed, or run `npx tsx scripts/promote-admin.ts you@example.com` in `backend/`. Log in again afterwards so the JWT carries the new role.

## Configuration

Backend (`backend/.env`, see [`.env.example`](./backend/.env.example)):

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `JWT_SECRET` | yes | JWT signing key |
| `OPENAI_API_KEY` | for AI features | Theory explanations, daily topics, forum insight pipeline. Without it, daily topics fall back to a fixed default topic. |
| `CRON_SECRET` | for cron endpoints | Shared secret checked via the `x-cron-secret` header |
| `FRONTEND_URL` | in production | CORS allow-origin (`*.vercel.app` previews are also allowed in production) |
| `ADMIN_SEED_*`, `ADMIN_EMAIL` | no | Admin bootstrap on seed |
| `SENTRY_DSN`, `LOGTAIL_SOURCE_TOKEN` | no | Error tracking and structured logs — see [backend/OBSERVABILITY.md](./backend/OBSERVABILITY.md) |
| `FORUM_INSIGHT_MIN_LIKES` | no | Like threshold for the insight pipeline (default 3) |

Frontend: `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`). Worker: `API_URL`, `CRON_SECRET`, optional `SENTRY_DSN`.

## Main routes (frontend)

| Path | Purpose |
|------|---------|
| `/` | Home |
| `/forum` | Discussion tab (Today + Past Discussions) and Community tab (All Posts / My Posts) |
| `/theory` | Redirects to `/theory/notation-reading` |
| `/theory/notation-reading` · `/rhythm-meter` · `/pitch-scales-keys` · `/intervals` · `/chords-harmony` · `/form-analysis` | The six Theory domains (all live). `/theory/scales` redirects to `pitch-scales-keys`. |
| `/account` | Login, register, username, timezone/language, learning style, account deletion |
| `/contact` | Contact form (UI only — not wired to a backend yet) |
| `/admin` | Admin home (requires `role = admin`) |
| `/admin/forum` · `/admin/users` · `/admin/theory` | Forum moderation (hide topics), user roles, Theory standard-definition editor |
| `/admin/learning` · `/admin/learning-table` | Run the forum insight pipeline, review drafts, and view the topic × style matrix |

HTTP endpoints: [docs/API.md](./docs/API.md).

## Deployment notes

- **Backend (Render):** build with `npm run build`, apply schema with `npm run prisma:deploy` (migrations, not `db push`), start with `npm start`. Express trusts one proxy hop so rate limiting sees real client IPs.
- **Frontend (Vercel):** set `NEXT_PUBLIC_API_URL` to the backend's public URL.
- **Worker:** any always-on process host; it needs network access to the backend and the same `CRON_SECRET`.

## Documentation index

Read these when you need to recall *design intent*, not just run commands:

| Document | When to read it |
|----------|-----------------|
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Product areas, responsibility split, auth flow, AI usage, "what belongs where" checklist |
| [docs/DATA_MODEL.md](./docs/DATA_MODEL.md) | Table-by-table rationale, timezone rules, frontend catalogs, denormalization |
| [docs/API.md](./docs/API.md) | Every HTTP endpoint, auth requirements, request bodies |
| [docs/decisions/](./docs/decisions/) | ADRs — why specific design choices were made. Historical records: file names inside older ADRs may since have been superseded by later ADRs. |
| [backend/OBSERVABILITY.md](./backend/OBSERVABILITY.md) | Logging, Sentry, correlation IDs, latency thresholds |
| [music-talks/app/theory/README.md](./music-talks/app/theory/README.md) | How the Theory catalog is split between frontend and backend, and how to add a topic |

**Source of truth in code** (prefer updating code over duplicating it in docs):

| Concern | File |
|---------|------|
| Database shape | `backend/prisma/schema.prisma` |
| Forum business and permission rules | `backend/src/services/forum.service.ts` |
| Theory domains and topic catalog (UI) | `music-talks/app/theory/theoryDomains.ts`, `theoryDomainConfig.ts`, `*Data.ts` |
| Theory topic catalog (backend mirror) | `backend/src/data/theoryTopicCatalog.ts` |
| Standard definition text | `backend/src/data/*DefinitionsSeed.ts` (seeded into `notation_definitions`; editable afterwards at `/admin/theory`) |
| AI prompts | `backend/src/services/ai.service.ts`, `forumInsightPipeline.service.ts`, `controllers/cron.controller.ts` |

## Known gaps

- No automated test suite in any package yet.
- `/contact` has no submit handler.
- `backend/src/workers/` (`scheduler.ts`, `dailyContent.worker.ts`) are unused stubs. Daily topics are scheduled by `python-worker/`, not by the backend.
- The forum insight pipeline has no scheduled caller in this repo.
