# ADR 008: Forum → AI learning table pipeline

**Status:** Accepted (foundation implemented)  
**Date:** 2026-05  
**Builds on:** [ADR 006](./006-theory-learning-data-model.md), [ADR 007](./007-theory-curriculum-restructure.md)

## Context

Theory has three answer layers:

1. **Standard** — `notation_definitions` (fixed, authoritative)
2. **AI** — on-demand, personalized by **Learning style** (`explanation_categories.aiGuidance`) and optional **AI learning table** rows
3. **Style discovery UI** — “More ways to understand” (mock style samples + “This helps me”) — **separate from this ADR** ([ADR 005](./005-theory-learning-ui-flow.md))

Users want Forum likes to signal good explanations. An agent classifies content, maps it to a catalog topic and style, and stores distilled insights in an **AI learning table**. When Theory AI generates an answer, it may pull matching rows to strengthen the prompt. Learners do **not** browse this table on Theory pages; admins manage it at `/admin/learning-table`.

## Decision

### AI learning table — `explanation_category_insights`

| Field | Purpose |
|-------|---------|
| `theoryTopicId` | Catalog id (`major-triad`, `staff`, …) |
| `categoryId` | Learning style (`music-core`, `art`, `everyday-life`, `performance`) |
| `title` | Short label for admin review / matrix UI |
| `content` | Human-readable summary for admin review queue |
| `promptSummary` | Distilled angle injected into AI explain prompt |
| `sourceType` | `forum_topic` \| `forum_comment` |
| `sourceRef` | Unique topic/comment id (no duplicate processing) |
| `sourceLikeCount` | Likes when captured |
| `status` | `draft` \| `approved` \| `rejected` |

Starts **empty**. Only **approved** rows affect AI explain prompts.

### Pipeline (cron)

```
Forum topic/comment (likes ≥ threshold)
  → skip if sourceRef already in insights
  → AI agent: reads parent post + reply for comments; theoryTopicId? categoryId? …
  → if shouldStore → insert (approved when agent confident, else draft)
```

Trigger: `POST /api/cron/process-forum-insights` with `x-cron-secret`.

Env: `FORUM_INSIGHT_MIN_LIKES` (default 3).

Admin: run pipeline + approve/reject at `/admin/learning`; matrix at `/admin/learning-table`.

### Theory AI generation

`POST /api/ai/explain-notation` accepts optional `theoryTopicId`.

When present:

1. Load user learning style → `aiGuidance`
2. Load **approved** insights for `theoryTopicId` (+ filter by user's style if set)
3. Inject both into prompt

Standard definition is **not** RAG-fed in v1 (keeps latency/cost down).

Response may include `communityInsightCount` (number of table rows used) for the AI explanation subtitle — this is **not** a public list of Forum cards.

### Public Theory UI

- **“More ways to understand”** — style sample cards only ([ADR 005](./005-theory-learning-ui-flow.md)). **Does not** read this table.
- `GET /api/theory/topics/:topicId/insights` — optional API for approved rows (admin tooling / future use); not wired to Theory UI.

## Out of scope (v1)

- Auto-reject stale insights
- RAG over full Forum text
- Caching AI responses
- Showing learning-table rows on Theory pages

## Consequences

- Forum quality improves AI answers over time without editing standard definitions
- `sourceRef` uniqueness prevents double-ingest
- Pipeline requires `OPENAI_API_KEY` + `CRON_SECRET` to run
- AI learning table and style-discovery UI remain independent features
