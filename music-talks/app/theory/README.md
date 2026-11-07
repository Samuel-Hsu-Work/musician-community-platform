# Theory catalog

This folder holds both the `/theory/*` routes and the **topic catalog** — the list of domains, categories, and topics the Theory UI shows. The catalog is split across frontend and backend, and the two halves are linked only by topic `id` strings. Read this before adding, renaming, or removing a topic.

## What lives where

| Concern | File | Notes |
|---------|------|-------|
| The six domains (label, route, icon) | `theoryDomains.ts` | Order here is the navbar order |
| Domain → categories + topics | `theoryDomainConfig.ts` | Wires each domain to its data file |
| Topics per domain | `notationReadingData.ts`, `rhythmMeterData.ts`, `pitchScalesKeysData.ts`, `intervalData.ts`, `chordData.ts`, `formData.ts` | Shape: `TheoryTopic` in `theoryTopicTypes.ts` |
| Scale notes and frequencies | `scaleData.ts` | Pulled into `pitchScalesKeysData.ts` as `kind: "scale"` topics |
| "More ways to understand" sample cards | `theoryLearningFlow.ts` | UI prototype with mock content; does **not** read the AI learning table |
| Backend mirror of the catalog | `backend/src/data/theoryTopicCatalog.ts` | Used to validate ids, name topics in AI prompts, and drive admin tooling |
| Standard definition text | `backend/src/data/*DefinitionsSeed.ts` → `notation_definitions` table | Seeded; editable later at `/admin/theory` |

Every `app/theory/<domain>/page.tsx` just renders the shared `components/theory/TheoryDomainPage` with its domain id.

## How a topic is displayed

1. The sidebar lists topics from `theoryDomainConfig.ts` (frontend only — no API call).
2. Selecting a topic calls `GET /api/theory/notations/:topicId` for the standard definition.
3. Requesting an AI explanation calls `POST /api/ai/explain-notation` with `theoryTopicId`. The backend adds the user's learning style and any **approved** AI learning-table rows for that topic to the prompt.

## Invariant: ids must match on both sides

A topic `id` must be identical in:

- the frontend `*Data.ts` file,
- `backend/src/data/theoryTopicCatalog.ts`,
- the seeded `notation_definitions` row (which `prisma/seed.ts` builds from the backend catalog).

Nothing checks this automatically. A mismatch shows up as a topic with no standard definition, or as forum insights that can never be mapped to that topic.

## Adding a topic

1. Add it to the right `*Data.ts` file here.
2. Add the same `id`, `name`, `category`, `domainId`, and `kind` to `backend/src/data/theoryTopicCatalog.ts`.
3. Provide its standard definition in `DEFINITION_OVERRIDES` in `backend/src/data/theoryDefinitionsSeed.ts` (or reuse one from a per-domain seed). The seed throws if any catalog topic has no definition.
4. Run `npm run prisma:seed` in `backend/`. The seed upserts every catalog topic and **deletes** `notation_definitions` rows whose id is no longer in the catalog, so a rename discards any edits made at `/admin/theory`.

Background: [ADR 003](../../../docs/decisions/003-theory-catalog-in-frontend.md), [ADR 007](../../../docs/decisions/007-theory-curriculum-restructure.md), [ADR 008](../../../docs/decisions/008-forum-ai-learning-pipeline.md).
