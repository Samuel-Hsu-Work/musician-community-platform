# Architecture

High-level map of MusicTalks — **what each part does** and **how responsibilities are separated**. For field-level data details see [DATA_MODEL.md](./DATA_MODEL.md). For HTTP contracts see [API.md](./API.md).

## System diagram

```
┌─────────────────────┐         ┌─────────────────────────────┐
│  music-talks        │  HTTP   │  backend                    │
│  (Next.js, :3000)   │────────▶│  Express + Prisma (:3001)   │
│                     │         │         │                   │
│  • Forum UI         │         │         ▼                   │
│  • Theory UI        │         │    PostgreSQL               │
│  • Account UI       │         └──────────▲──────────────────┘
└─────────────────────┘                    │
                                             │ POST /api/cron/generate-topic
                                    ┌────────┴────────┐
                                    │  python-worker  │
                                    │  (daily 00:00 UTC)  │
                                    └─────────────────┘
```

- **Frontend** owns presentation and static Theory catalogs (`theoryDomainConfig.ts`, per-domain `*Data.ts` files, `scaleData.ts`).
- **Backend** owns auth, all persistence (Forum, standard definitions, learning styles, AI learning table), AI endpoints, and admin APIs. It keeps a mirror of the Theory topic catalog in `backend/src/data/theoryTopicCatalog.ts` — see [music-talks/app/theory/README.md](../music-talks/app/theory/README.md).
- **Python worker** only triggers AI topic generation; it does not touch the database directly.

## Product areas & responsibility split

### Forum (`/forum`)

Three user-facing goals, implemented as **two top-level tabs + one sub-filter**:

| UI | Data filter | Who creates content | Auth to participate |
|----|-------------|---------------------|---------------------|
| **Discussion** tab | `Topic.type = daily_discussion` | Python worker / cron (AI) | Read: everyone · Comment: logged-in |
| **Community** tab → All Posts | `Topic.type = community_post` | Logged-in users | Post / comment / like: logged-in |
| **Community** tab → My Posts | `community_post` where `userId = me` | Same as Community | Edit / delete own posts only |

Design principle: **My Posts is a view over Community**, not a third content type. See [decisions/002-my-posts-as-community-filter.md](./decisions/002-my-posts-as-community-filter.md).

Discussion sidebar UX:

- **Today** — latest AI topic (pinned)
- **Past Discussions** — archive grouped by `date`

Community sidebar UX:

- Category-style browse is not used; list is **newest first** with author + likes.
- **My Posts** sub-filter mirrors Forum’s “filter within a domain” pattern.

### Theory (`/theory/*`)

Top-level curriculum in `theoryDomains.ts` (Ear / Practice excluded for now). Left sidebar: **domain → topics → detail panel**.

| Route | Status | Content |
|-------|--------|---------|
| `/theory/notation-reading` | Live | Staff, clefs, articulation, dynamics, navigation (~34 topics) |
| `/theory/rhythm-meter` | Live | Durations, rests, meters, grouping, concepts (~32 topics) |
| `/theory/pitch-scales-keys` | Live | Pitch, keys, scale patterns + 24 scale reference |
| `/theory/intervals` | Live | Intervals, naming, consonance (~18 topics) |
| `/theory/chords-harmony` | Live | Triads, 7ths, extensions, progressions (~29 topics) |
| `/theory/form-analysis` | Live | Phrases, forms, analysis (~17 topics) |

Redirects: `/theory` → `/theory/notation-reading`; `/theory/scales` → `/theory/pitch-scales-keys`.

**178 catalog topics** — `TheoryDomainPage` + DB standard text + AI. See [ADR 007](./decisions/007-theory-curriculum-restructure.md).

See [decisions/003-theory-catalog-in-frontend.md](./decisions/003-theory-catalog-in-frontend.md).

### Account (`/account`)

Minimal identity model (Scheme A):

- **Login identity**: email (stable), password, username (unique, editable)
- **Preferences**: language, timezone only
- No avatar, bio, or AI learning profile tables

**Timezone display:** timestamps are stored in UTC; the UI formats them with the user’s IANA preference (seeded from the device at register). Guests use the browser timezone. Saving preferences updates `localStorage` and broadcasts `musictalks:timezone-updated` so open pages (e.g. Forum) refresh labels without reload. See [DATA_MODEL.md § Time & timezone](./DATA_MODEL.md#time--timezone).

Username is **denormalized** into Forum (`Topic.authorUsername`, `Comment.username`) for display. Changing username batch-updates forum rows.

### Admin (`/admin/*`)

Visible only to `User.role = admin`; every `/api/admin/*` route runs `authenticate` + `requireAdmin`. `AdminShell` on the frontend is a convenience guard, not the security boundary.

| Page | Purpose |
|------|---------|
| `/admin/forum` | Hide / unhide Forum topics (`Topic.hidden`) |
| `/admin/users` | Promote / demote users |
| `/admin/theory` | Edit standard definitions in `notation_definitions` |
| `/admin/learning` | Run the forum insight pipeline; approve / reject draft insights |
| `/admin/learning-table` | Topic × learning-style matrix of AI learning-table rows |

## Backend layering

```
routes/       → HTTP, validation, status codes
controllers/  → parse request, call service, format response
services/     → business rules & permissions (especially forum.service.ts)
prisma/       → schema & DB access
```

Put permission checks in **services**, not only in controllers, so rules stay in one place.

## Authentication flow

1. `POST /api/auth/login` or `/register` → JWT + user object
2. Frontend stores `token` and `user` in `localStorage`
3. Authenticated requests send `Authorization: Bearer <token>`
4. `optionalAuthenticate` middleware attaches user when token present (Forum read paths)

## AI usage

| Feature | Endpoint | Trigger |
|---------|----------|---------|
| Daily discussion topic | `POST /api/cron/generate-topic` | Python worker (daily 00:00 UTC; one topic per UTC date) |
| Theory explanation | `POST /api/ai/explain-notation` | User requests an AI explanation for a Theory topic (prompt includes learning style + approved learning-table rows) |
| Forum → AI learning table | `POST /api/admin/forum-insights/run` or `POST /api/cron/process-forum-insights` | Admin button at `/admin/learning`, or an external scheduler (none configured in this repo) — see [ADR 008](./decisions/008-forum-ai-learning-pipeline.md) |

All use OpenAI through the Vercel AI SDK (`ai.service.ts`, `forumInsightPipeline.service.ts`) when `OPENAI_API_KEY` is set; the daily-topic cron falls back to a fixed default topic if it is missing.

## What belongs where (checklist)

When adding a feature, ask:

| Question | If yes → |
|----------|----------|
| User-generated, shared, needs persistence? | Backend + Prisma |
| Stable reference list (symbols, scales)? | Frontend `*Data.ts` + category enum |
| Display-only filter / tab? | Frontend state only — no new DB table |
| Cross-user permission rule? | `forum.service.ts` (or new service) + document in DATA_MODEL |

## Related docs

- [DATA_MODEL.md](./DATA_MODEL.md) — tables, enums, denormalization
- [API.md](./API.md) — endpoints
- [decisions/](./decisions/) — design decision records
