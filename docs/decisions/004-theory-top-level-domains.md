# ADR 004: Theory top-level domains

**Status:** Accepted  
**Date:** 2026-05

## Context

Theory was split into two nav items (Notations, Scales). A fuller music-theory curriculum needs clearer top-level areas (notation, rhythm, pitch/keys, intervals, harmony, form) without Ear/Practice for now.

## Decision

Introduce six top-level domains in `theoryDomains.ts`:

| Domain | Route | Status |
|--------|-------|--------|
| Notation & Reading | `/theory/notation-reading` | Live |
| Rhythm & Meter | `/theory/rhythm-meter` | Live |
| Pitch, Scales & Keys | `/theory/pitch-scales-keys` | Live |
| Intervals | `/theory/intervals` | Live |
| Chords & Harmony | `/theory/chords-harmony` | Live |
| Form & Analysis | `/theory/form-analysis` | Live |

Existing `notationData` subcategories map to domains:

- `reading`, `navigation`, `expression` → Notation & Reading
- `rhythm` → Rhythm & Meter
- `pitch` → Pitch, Scales & Keys (scales live in the same route)

`/theory` and `/theory/scales` redirect to the new default and pitch route.

## Consequences

- Sidebar shows curriculum first, then topic list per domain
- Future lessons (intervals, chords, form) add items under their domain without reshaping Notations vs Scales
- `notationData` subcategories remain for grouping within a domain

## Alternatives considered

- Single `/theory` page with all 39 symbols — rejected; too flat for learning paths
- Keep Scales as separate top-level tab — rejected; pitch and scales belong together pedagogically
