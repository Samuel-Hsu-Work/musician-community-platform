# Data Model

What data exists, where it lives, and **why** it is structured this way. The **schema source of truth** is always `backend/prisma/schema.prisma` — this doc explains intent; if they diverge, trust the schema.

## Overview

MusicTalks uses two storage styles:

| Style | Used for | Location |
|-------|----------|----------|
| **PostgreSQL (dynamic)** | Users, forum topics, comments, likes | Prisma models |
| **Frontend catalogs (static)** | Theory topics per domain | `theoryDomainConfig.ts`, `*Data.ts`, `scaleData.ts` |

Do not move Theory catalogs into the DB unless users need to edit them or you need admin content management.

---

## PostgreSQL entities

### User & Account

```
User
├── email          unique, login identifier (read-only in UI)
├── username       unique, 3–30 chars, shown in Forum
├── password       hashed
└── UserPreferences (1:1)
    ├── language
    └── timezone
```

**Case sensitivity:** Email is stored lowercase; login and uniqueness checks are case-insensitive. Username keeps the casing the user chose for display, but login and uniqueness checks are case-insensitive (`John` and `john` are the same account).

**Similarity:** New or changed usernames must differ from every existing username by **more than 1 edit** (Levenshtein distance &gt; 1, case-insensitive). Blocks near-duplicate names like `john` / `jon`, but allows names like `Tester01` and `Tester404`. Error message: `Please choose a more distinct username`.

**Username hold:** After account deletion, the former username is reserved in `username_holds` for **30 days** (case-insensitive) before it can be registered again.

**Account deletion:** `DELETE /api/account` removes PII (user row, preferences, likes). Community posts and comments are **retained** with `authorUsername` / `username` set to `This account no longer exists` and `userId` cleared (tombstone / anonymization).

**Removed / intentionally absent:** profile table, displayName, avatar, AI learning prefs, career analogy fields.

### Time & timezone

| Layer | Rule |
|-------|------|
| **Storage** | All `DateTime` fields are UTC instants in PostgreSQL (`@default(now())`). API returns ISO 8601 strings. |
| **User preference** | `UserPreferences.timezone` — IANA name (e.g. `Asia/Taipei`). Validated on register and `PATCH /preferences` (`resolveTimezone`; invalid → `UTC`). |
| **Register** | Web client sends `timezone: getBrowserTimezone()`; backend stores it as the initial preference. API-only register without `timezone` defaults to `UTC`. |
| **Guests** | Frontend uses browser `Intl` timezone for display (no account preference). |
| **Display** | Relative labels for forum timestamps (`3 minutes ago`); hover/title shows absolute local time. Account “member since” uses absolute format. |
| **`Topic.date`** | `YYYY-MM-DD` calendar day for archive grouping — not a full instant. **AI daily topics:** UTC day (cron). **Community posts:** poster’s preference timezone **at create time** (frozen; not recalculated if preference changes later). |
| **Client sync** | `setCachedTimezone` / `clearCachedTimezone` dispatch `musictalks:timezone-updated`; `useUserTimezone` listens so Forum updates without a full page reload after saving preferences. |

**What changes when the user edits timezone**

| Affected | Not affected |
|----------|----------------|
| All timestamp **display** (forum, account) for that viewer | Stored `createdAt` / `updatedAt` UTC values |
| **New** community posts’ `Topic.date` (uses current preference) | Existing posts’ `Topic.date` |
| Archive date **labels** in the sidebar (formatted in viewer TZ) | AI daily `Topic.date` (always UTC calendar day at generation) |

**Common pitfalls (and how this project avoids them)**

| Pitfall | Symptom | Mitigation here |
|---------|---------|-----------------|
| Store local time without TZ | Data wrong after server move | Store UTC only; convert on read |
| `toISOString().split('T')[0]` for “today” | Late-night posts on wrong calendar day | `getCalendarDateInTimezone` with explicit IANA rules |
| Guests forced to UTC | Same comment looks different after login | Guests: browser TZ; logged-in: preference |
| Relative time only | Can’t audit exact moment | `title` / `dateTime` on `<time>` elements |
| Parse `YYYY-MM-DD` as midnight local | Off-by-one day in sidebar | `formatArchiveDate` uses UTC noon + viewer TZ |
| Invalid IANA strings | `Intl` throws, UI breaks | `resolveTimezone` on write; `resolveDisplayTimezone` on read |
| Stale TZ after preference save | Forum tab still shows old labels | `TIMEZONE_UPDATED_EVENT` + `useUserTimezone` listener |

Helpers: `backend/src/utils/timezone.ts`, `music-talks/app/utils/datetime.ts`, `music-talks/app/utils/userTimezone.ts`, `music-talks/app/hooks/useUserTimezone.ts`.

### Forum

```
Topic
├── type           daily_discussion | community_post   ← primary classifier
├── date           YYYY-MM-DD (display / archive grouping for AI topics)
├── title, content
├── userId         null for AI topics
├── authorUsername denormalized for community posts
├── Comment[]
└── TopicLike[]    community posts only

Comment
├── topicId
├── userId         nullable (legacy anonymous comments possible)
├── username       denormalized display name
├── parentId       optional; reply to a top-level comment (Facebook-style sub-comment)
├── text
└── CommentLike[]

TopicLike          @@unique([topicId, userId])
CommentLike        @@unique([commentId, userId])
```

#### `Topic.type` (critical)

| Value | Meaning | Created by | Editable by user |
|-------|---------|------------|------------------|
| `daily_discussion` | AI daily topic | Cron / worker | No |
| `community_post` | User article | Logged-in user | Author only (via My Posts) |

Never use tags or a separate table for this split — permissions and UI differ entirely. See [decisions/001-forum-topic-types.md](./decisions/001-forum-topic-types.md).

#### Likes

- Stored in **association tables**, not `likeCount` on Topic/Comment.
- `likeCount` is computed at read time in `forum.service.ts`.
- Users cannot like their own posts or comments.

#### Denormalized names

`Topic.authorUsername` and `Comment.username` are copied at write time so Forum reads stay simple. When username changes (`PATCH /api/account/username`), the backend batch-updates related forum rows.

---

## Frontend catalogs

### Theory domains — `music-talks/app/theory/theoryDomains.ts`

Six top-level areas in the Theory sidebar (see [ADR 004](./decisions/004-theory-top-level-domains.md), [ADR 007](./decisions/007-theory-curriculum-restructure.md)). All six domains are live with **178** catalog topics.

### Theory domains — `music-talks/app/theory/theoryDomainConfig.ts`

Six live domains (see [ADR 007](./decisions/007-theory-curriculum-restructure.md)). Each domain has a dedicated catalog file with categories and topics (`concept` | `symbol` | `scale`).

| Domain file | Topics (approx.) |
|-------------|------------------|
| `notationReadingData.ts` | 34 |
| `rhythmMeterData.ts` | 32 |
| `pitchScalesKeysData.ts` | 24 concepts + 24 scales |
| `intervalData.ts` | 18 |
| `chordData.ts` | 29 |
| `formData.ts` | 17 |

**Total catalog: 178 topics.** UI: `TheoryDomainPage.tsx` per route.

### Notation definitions — `notation_definitions` (PostgreSQL)

Canonical **standard explanations** for all Theory topics. Sidebar catalog lives in frontend domain files; fixed text is seeded from `backend/src/data/theoryDefinitionsSeed.ts` (built from `theoryTopicCatalog.ts`).

| Field | Purpose |
|-------|---------|
| `id` | Matches catalog id (e.g. `staff`, `ii-v-i-progression`, `c-major`) |
| `name` | Display name |
| `category` | Subgroup within domain (e.g. `articulation`, `scale-reference`) |
| `standardDefinition` | Fixed reference text |

Seed: `cd backend && npm run prisma:seed` — upserts catalog and **removes** obsolete ids.

**AI explanation** is generated on demand; learning-style personalization via `explanation_categories` + user preference.

### Explanation categories — `explanation_categories` (PostgreSQL)

Learning-style lenses for AI personalization and future Forum-derived insight cards.

| Field | Purpose |
|-------|---------|
| `id` | Slug: `music-core`, `art`, `everyday-life`, `performance` |
| `label`, `shortLabel`, `icon`, `description` | UI metadata |
| `aiGuidance` | Prompt fragment: how AI should explain from this angle |
| `sortOrder` | Display order |

Seed: `backend/src/data/explanationCategoriesSeed.ts`.

### User learning style — `user_learning_categories` (PostgreSQL)

Many-to-many join: `userId` + `categoryId`. Replaced atomically on `PATCH /api/account/learning-style`. Guests mirror prefs in `localStorage` (`theoryLearningPreferences`) and pass `categoryIds` on explain-notation.

### User roles

`User.role`: `user` (default) | `admin`. Bootstrap via `ADMIN_EMAIL` in seed or `scripts/promote-admin.ts`. Admin JWT required for `/api/admin/*`. Manage in `/admin/users`.

### Forum moderation

`Topic.hidden` (default `false`). Hidden community posts are excluded from public Forum lists and permalink fetch; admins can hide/unhide via `/admin/forum`.

### Theory content management

`notation_definitions` — admin edits `name`, `category`, `standardDefinition` via `/admin/theory`. Sidebar catalog labels remain in frontend `*Data.ts`; Standard card reads from DB.

### AI learning table — `explanation_category_insights`

Forum → agent → Theory AI (see [ADR 008](./decisions/008-forum-ai-learning-pipeline.md)).

| Field | Purpose |
|-------|---------|
| `theoryTopicId` | Catalog topic id (`major-triad`, `staff`, …) |
| `categoryId` | Learning style |
| `title`, `content` | Admin review queue / matrix UI |
| `promptSummary` | Distilled angle injected into AI explain prompt |
| `sourceType` | `forum_topic` \| `forum_comment` |
| `sourceRef` | Unique `topic:{id}` or `comment:{id}` |
| `sourceLikeCount` | Likes when captured |
| `status` | `draft` \| `approved` \| `rejected` — only **approved** used |

Starts empty. Cron: `POST /api/cron/process-forum-insights` (likes ≥ `FORUM_INSIGHT_MIN_LIKES`, default 3).

### Scales — `music-talks/app/theory/scaleData.ts`

Scale **instances** (24) are referenced from `pitchScalesKeysData.ts` with `kind: scale`. Frequencies computed client-side via `getScaleFrequencies()`.

---

## Classification comparison

Forum and Theory both use **typed categories**, but they are unrelated enums:

| Domain | Field | Values | Purpose |
|--------|-------|--------|---------|
| Forum | `Topic.type` | `daily_discussion`, `community_post` | Content type + permissions |
| Theory Notations | `NotationCard.category` | 5 categories | Browse / filter symbols |
| Theory Scales | `ScaleDefinition.category` | 4 categories | Browse / filter scales |

**No shared tag system** across Forum and Theory at this stage.

### When to add tags later

| Signal | Action |
|--------|--------|
| Community posts > ~100 | Optional tags on `community_post` only |
| Theory items > ~100 per category | Subcategories or difficulty level |
| Cross-feature search | Global search index — still keep primary `type` / `category` |

---

## Entity relationship (Forum)

```
User ──< Topic (community_post: userId required)
User ──< Comment
User ──< TopicLike >── Topic
User ──< CommentLike >── Comment
Topic ──< Comment
```

AI topics (`daily_discussion`) have `userId = null` and no `TopicLike` usage.

---

## Migration notes

- Column `topics.source` was renamed to `topics.type` with values `ai`/`user` → `daily_discussion`/`community_post`.
- New environments: run `npm run prisma:push` in `backend/` after pulling schema changes.

---

## Related docs

- [ARCHITECTURE.md](./ARCHITECTURE.md) — product areas
- [API.md](./API.md) — how to read/write this data over HTTP
- [decisions/](./decisions/) — why these choices were made
