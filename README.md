# MusicTalks

A music learning web app with a **Forum** (daily AI discussions + community posts) and a **Theory** section (music notations reference + interactive scales).

## Repository layout

| Path | Role | Default port |
|------|------|--------------|
| `music-talks/` | Next.js frontend | 3000 |
| `backend/` | Express API + Prisma + PostgreSQL | 3001 |
| `python-worker/` | Daily cron (00:00 UTC) — calls backend to generate one AI discussion topic | — |
| `scripts/` | Standalone utilities (not part of the running app) | — |

## Quick start (local)

### 1. Database + backend

```bash
cd backend
cp .env.example .env   # then edit DATABASE_URL, JWT_SECRET, etc.
npm install
npm run prisma:generate
npm run prisma:push
npm run dev
```

Required in `backend/.env`: `DATABASE_URL`, `JWT_SECRET`. Optional: `OPENAI_API_KEY`, `CRON_SECRET`, `FRONTEND_URL`, `ADMIN_SEED_*` (see `backend/.env.example`).

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
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # API_URL, CRON_SECRET must match backend
python worker.py
```

See [python-worker/README.md](./python-worker/README.md) for details.

## Documentation index

Read these when you need to **recall design intent**, not just run commands:

| Document | When to read it |
|----------|-----------------|
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Product areas, service diagram, responsibility split (Forum / Theory / Account) |
| [docs/DATA_MODEL.md](./docs/DATA_MODEL.md) | Database schema rationale, frontend catalogs, classification enums |
| [docs/API.md](./docs/API.md) | HTTP endpoints, auth requirements, query params |
| [docs/decisions/](./docs/decisions/) | Why specific design choices were made (ADRs) |
| [backend/OBSERVABILITY.md](./backend/OBSERVABILITY.md) | Logging, Sentry, correlation IDs |

**Source of truth in code** (prefer updating code over duplicating in docs):

- DB shape → `backend/prisma/schema.prisma`
- Forum business rules → `backend/src/services/forum.service.ts`
- Notation catalog → `music-talks/app/theory/notationData.ts`
- Scale catalog → `music-talks/app/theory/scaleData.ts`

## Main routes (frontend)

| Path | Purpose |
|------|---------|
| `/` | Home |
| `/forum` | Daily Discussion + Community (+ My Posts filter) |
| `/theory` | Redirects to Theory curriculum (`/theory/notation-reading`) |
| `/theory/notation-reading` | Notation & reading symbols (AI explanations) |
| `/theory/rhythm-meter` | Rhythm & meter symbols |
| `/theory/pitch-scales-keys` | Pitch symbols + scale browser |
| `/theory/intervals`, `/chords-harmony`, `/form-analysis` | Coming soon placeholders |
| `/account` | Login, register, username, preferences |
| `/contact` | Contact form |
