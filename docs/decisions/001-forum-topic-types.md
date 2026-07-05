# ADR 001: Forum topic types

**Status:** Accepted  
**Date:** 2026-05

## Context

Forum serves two different purposes: hourly AI discussion prompts and user-written community articles. They have different permissions, UI, and sorting rules.

## Decision

Use a single `Topic` table with a `type` field:

- `daily_discussion` — AI-generated, system-owned, comment-only, archived by date
- `community_post` — user-owned, supports likes, editable via My Posts filter

Previously stored as `source: ai | user`; renamed for clarity.

## Consequences

- API filter: `GET /api/forum/topics?type=daily_discussion|community_post`
- Likes and edit/delete only apply to `community_post`
- Do not add a third top-level “content type” for My Posts — it is a filter on community posts

## Alternatives considered

- Separate tables for AI vs user topics — rejected; shared Comment model makes one table simpler
- Tags instead of type — rejected; permissions differ at the type level, not tag level
