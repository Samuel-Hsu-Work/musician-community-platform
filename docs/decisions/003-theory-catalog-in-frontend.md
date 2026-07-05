# ADR 003: Theory catalogs in frontend TypeScript

**Status:** Accepted  
**Date:** 2026-05

## Context

Theory section lists music notations (39) and scales (24). Content is curated, changes infrequently, and is not user-editable.

## Decision

Store catalogs in frontend files:

- `music-talks/app/theory/notationData.ts`
- `music-talks/app/theory/scaleData.ts`

Each item has a `category` enum for sidebar grouping and filter chips. Notation definitions are fetched from AI on select; scale frequencies are computed client-side.

## Consequences

- No DB migrations when adding a symbol or scale
- Categories are fixed vocabularies — avoid free-form tags until volume grows
- Backend only involved for notation AI explanations

## Alternatives considered

- DB tables + admin content management — deferred until editorial workflow is needed
- Single shared `theory_items` table — rejected; notations and scales have different shapes and UX
