# API Reference

Base URL: `http://localhost:3001` (local) · All routes prefixed with `/api`.

Auth: send `Authorization: Bearer <jwt>` for protected routes.

## Auth — `/api/auth`

| Method | Path | Auth | Body | Notes |
|--------|------|------|------|-------|
| POST | `/register` | — | `{ email, username, password, timezone? }` | `timezone` optional IANA id from client; defaults to UTC if invalid |
| POST | `/check-availability` | — | `{ username? }` or `{ email? }` | Format + uniqueness for register blur |
| POST | `/login` | — | `{ emailOrUsername, password }` | Email or username |
| POST | `/logout` | — | — | Client removes token |

## Account — `/api/account`

| Method | Path | Auth | Body |
|--------|------|------|------|
| GET | `/me` | ✓ | — | Returns `learningStyleCategoryIds: string[]` |
| PATCH | `/username` | ✓ | `{ username }` |
| PATCH | `/preferences` | ✓ | `{ language?, timezone? }` | `timezone` must be a valid IANA id (invalid values stored as `UTC`). After save, web client should call `setCachedTimezone` so Forum timestamps update via `musictalks:timezone-updated`. |
| PATCH | `/learning-style` | ✓ | `{ categoryIds: string[] }` | Replaces Theory learning-style categories |
| DELETE | `/` | ✓ | `{ password }` | Permanently deletes account; anonymizes forum content |

Account deletion: removes `User` + preferences + learning categories + all likes. Community posts and comments remain with author label `This account no longer exists`.

## Forum — `/api/forum`

### Topics

| Method | Path | Auth | Query / body |
|--------|------|------|--------------|
| GET | `/topic/latest` | optional | Latest `daily_discussion` topic |
| GET | `/topics` | optional | `?type=…&page=1&limit=20&search=` — paginated; search title + content |
| GET | `/topics/:topicId` | optional | Single topic (permalink) |
| GET | `/topics/mine` | ✓ | `?page=1&limit=20&search=` — user's community posts |
| POST | `/topics` | ✓ | `{ title, content }` — creates `community_post` |
| PATCH | `/topics/:topicId` | ✓ | `{ title, content }` — own posts only |
| DELETE | `/topics/:topicId` | ✓ | Own posts only |
| POST | `/topics/:topicId/like` | ✓ | Toggle like — not on own post, not on AI topics |

### Comments

| Method | Path | Auth | Query / body |
|--------|------|------|--------------|
| GET | `/comments` | optional | `?topicId=<id>&page=1&limit=20` — top-level + nested replies |
| POST | `/comments` | ✓ | `{ topicId, text, parentId? }` — reply via `parentId` |
| PATCH | `/comments/:commentId` | ✓ | `{ text }` — own comments only |
| DELETE | `/comments/:commentId` | ✓ | Own only; cascades replies |
| POST | `/comments/:commentId/like` | ✓ | Toggle — not on own comment |

### Permission summary

| Action | daily_discussion | community_post |
|--------|------------------|----------------|
| Read | Everyone | Everyone |
| Comment | Logged-in | Logged-in |
| Create topic | System only | Logged-in |
| Edit / delete topic | — | Author |
| Like topic | — | Logged-in, not author |

Frontend permalink: `/forum?mode=community&topic=<topicId>` (Share button copies URL).

Implementation: `backend/src/services/forum.service.ts`.

## Theory — `/api/theory`

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/notations/:notationId` | — | Canonical definition from DB (`staff`, `major-triad`, …) |
| GET | `/topics/:topicId/insights` | — | Approved community insights (AI learning table); optional `?categoryId=` — not used by Theory UI |
| GET | `/explanation-categories` | — | Learning-style categories (label, icon; no `aiGuidance`) |

Returns `{ definition: { id, name, category, standardDefinition } }` for notations.

## AI — `/api/ai`

| Method | Path | Auth | Body |
|--------|------|------|------|
| POST | `/explain-notation` | optional | `{ notation: string, theoryTopicId?: string, categoryIds?: string[] }` |

Uses learning style + **approved** `explanation_category_insights` for `theoryTopicId` when provided.

Returns `{ explanation, personalized, categoryIds, communityInsightCount }`.

## Admin — `/api/admin`

Requires `Authorization: Bearer <token>` and `User.role = admin`.

| Method | Path | Notes |
|--------|------|-------|
| GET | `/me` | Verify admin session |
| POST | `/forum-insights/run` | Trigger Forum → AI learning pipeline (creates `draft` insights) |
| GET | `/insights?status=draft\|approved\|rejected\|all` | List insights for review |
| GET | `/insights/learning-table` | Approved insights + counts (live AI learning table) |
| PATCH | `/insights/:id` | Body: `{ status: "approved" \| "rejected" \| "draft" }` |
| GET | `/forum/topics?type=&hidden=&search=` | List Forum topics (includes hidden) |
| PATCH | `/forum/topics/:id` | Body: `{ hidden: boolean }` |
| GET | `/users?search=` | List users |
| PATCH | `/users/:id` | Body: `{ role: "user" \| "admin" }` |
| GET | `/theory/topics?domainId=&search=` | List catalog topics + DB status |
| GET | `/theory/topics/:id` | Topic detail for content management editor |
| PATCH | `/theory/topics/:id` | Body: `{ name?, category?, standardDefinition }` |

Bootstrap admin: set `ADMIN_EMAIL` in backend `.env`, then `npm run prisma:seed`. User must re-login for JWT role.

## Cron — `/api/cron`

| Method | Path | Auth | Headers |
|--------|------|------|---------|
| POST | `/generate-topic` | `x-cron-secret: <CRON_SECRET>` | One `daily_discussion` per UTC date; skips if today exists |
| POST | `/process-forum-insights` | `x-cron-secret: <CRON_SECRET>` | Scan high-like Forum posts/comments → AI learning table |

Returns `{ scanned, stored, skipped, errors, skipDetails[] }`. Each skip detail includes `reason` (`already_processed` | `ai_rejected` | `invalid_response`) and `detail` (AI reason text when available).

## Frontend env

| Variable | Default | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Backend base URL |

## Backend env (common)

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | ✓ | PostgreSQL connection |
| `JWT_SECRET` | ✓ | Token signing |
| `OPENAI_API_KEY` | — | AI topics + notation explanations |
| `CRON_SECRET` | — | Worker auth (must match python-worker) |
| `ADMIN_SEED_EMAIL` | — | Bootstrap admin email on `prisma db seed` |
| `ADMIN_SEED_USERNAME` | — | Bootstrap admin username (default `Admin`) |
| `ADMIN_SEED_PASSWORD` | — | Bootstrap admin password (skip seed admin if unset) |
| `ADMIN_EMAIL` | — | Also promote this existing user to `admin` on seed |
| `FORUM_INSIGHT_MIN_LIKES` | — | Min likes for Forum → insight pipeline (default 3) |
| `FRONTEND_URL` | — | CORS (default `http://localhost:3000`) |

Full observability vars: [backend/OBSERVABILITY.md](../backend/OBSERVABILITY.md).
