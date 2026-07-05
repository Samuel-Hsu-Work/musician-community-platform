# ADR 007: Theory curriculum restructure

**Status:** Accepted  
**Date:** 2026-05

## Context

Theory content grew from a single `notationData.ts` (39 symbols) split awkwardly across domains. Rhythm symbols mixed with pitch; slur lived under rhythm; scales were separate from pitch concepts; intervals/chords/form were thin.

## Decision

### Six domains, each with its own catalog

| Domain | Catalog file | Focus |
|--------|--------------|-------|
| Notation & Reading | `notationReadingData.ts` | Staff, clefs, articulation, dynamics, navigation |
| Rhythm & Meter | `rhythmMeterData.ts` | Durations, rests, meters, grouping, rhythm concepts |
| Pitch, Scales & Keys | `pitchScalesKeysData.ts` | Pitch fundamentals, accidentals, keys, patterns, 24 scales |
| Intervals | `intervalData.ts` | Simple intervals, naming, consonance |
| Chords & Harmony | `chordData.ts` | Triads through extensions, voice leading, progressions |
| Form & Analysis | `formData.ts` | Phrases, forms, analysis tools |

### Topic kinds

Each sidebar item has `kind`: `concept` | `symbol` | `scale`.

- **symbol** — score notation with optional `NotationSymbol` icon
- **scale** — includes `notes` + frequency grid in detail panel
- **concept** — text + Standard/AI panels only

### UI

Single `TheoryDomainPage` for all domains. Removed `notationData.ts`, `TheoryNotationPage`, `TheoryPitchScalesPage`, `TheoryConceptPage`.

### Database

- **178** topics in `notation_definitions` (table name unchanged)
- Seed: `theoryTopicCatalog.ts` + `theoryDefinitionsSeed.ts`
- Seed prunes ids not in catalog

### Removed / relocated

- Pitch accidentals moved from notation-reading → pitch domain
- Rhythm items removed from notation-reading
- Slur moved rhythm → articulation (notation-reading)
- Semitone/whole step live in pitch fundamentals, not intervals

## Consequences

- Clear pedagogical boundaries per domain
- Adding topics: edit domain catalog + definition override in seed
- `notation_definitions` name is legacy; stores all theory topics
