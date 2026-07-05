# ADR 006: Theory learning data model (standard + categories + prefs)

**Status:** Accepted  
**Date:** 2026-05  
**Supersedes (partially):** [ADR 005](./005-theory-learning-ui-flow.md) — server sync and AI personalization are now live; perspective cards remain UI prototype.

## Context

Theory explanations have three layers:

1. **Standard explanation** — fixed, authoritative text in the database (`notation_definitions`).
2. **AI explanation** — generated on demand; should reflect the learner’s **learning style** (category preferences) and, when available, **approved community insights** from the AI learning table ([ADR 008](./008-forum-ai-learning-pipeline.md)).
3. **Style discovery UI** — “More ways to understand” shows **sample cards per learning style** so users can pick a preference via “This helps me”. This is **not** the Forum learning table.

## Decision

### Data layers

| Layer | Table | Purpose |
|-------|-------|---------|
| Standard | `notation_definitions` | Canonical reference text per notation id |
| Category guidance | `explanation_categories` | Slug, label, icon, `aiGuidance` prompt fragment |
| User prefs | `user_learning_categories` | M2M: user ↔ selected categories |
| AI learning table | `explanation_category_insights` | Forum-derived angles for **AI prompt injection** (admin-managed; not Theory UI cards) |

Category slugs: `music-core`, `art`, `everyday-life`, `performance`.

### API

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/theory/explanation-categories` | — | List categories (no `aiGuidance` in response) |
| GET | `/api/account/me` | ✓ | Includes `learningStyleCategoryIds` |
| PATCH | `/api/account/learning-style` | ✓ | Body `{ categoryIds: string[] }` replaces prefs |
| POST | `/api/ai/explain-notation` | optional | Logged-in: server prefs; guest: optional `categoryIds` in body |

AI prompt injects `aiGuidance` for each selected category. When `theoryTopicId` is set, approved insight `promptSummary` rows may also be injected ([ADR 008](./008-forum-ai-learning-pipeline.md)). Response includes `personalized: boolean`, `categoryIds`, and `communityInsightCount`.

### Frontend

- **Account → Learning style** saves to server when logged in; guests use `localStorage` + pass `categoryIds` on explain-notation.
- **“This helps me”** on style sample cards toggles category and syncs to server when logged in.
- **“More ways to understand”** uses **shuffled mock perspective cards** (`theoryLearningFlow.ts`) — independent of Forum insights.

### Out of scope (this ADR)

- Forum → agent → insight extraction (see ADR 008)
- Caching AI explanations
- Scales / other Theory domains beyond notation AI hook

## Consequences

- Category guidance can be edited in DB/seed without code changes.
- User prefs survive across devices when logged in.
- AI learning table and style-discovery UI stay decoupled: table improves AI answers; cards capture user preference.

## Files

- `backend/prisma/schema.prisma`
- `backend/src/data/explanationCategoriesSeed.ts`
- `backend/src/services/theory.service.ts`
- `backend/src/services/ai.service.ts`
- `backend/src/controllers/ai.controller.ts`
- `backend/src/routes/account.routes.ts`, `theory.routes.ts`, `ai.routes.ts`
- `music-talks/app/theory/theoryLearningFlow.ts`
- `music-talks/app/components/theory/notations.tsx`, `TheoryLearningPanel.tsx`
- `music-talks/app/components/account/TheoryLearningPreferences.tsx`
