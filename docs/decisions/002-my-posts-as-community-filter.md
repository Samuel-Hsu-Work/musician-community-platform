# ADR 002: My Posts as Community sub-filter

**Status:** Accepted  
**Date:** 2026-05

## Context

Users need to manage their own community posts. Early UI used three equal tabs: Discussion | Community | My Posts. This caused cramped layout and implied My Posts was a separate domain.

## Decision

- Top-level Forum tabs: **Discussion** and **Community** only
- Inside Community (authenticated): sub-filter **All Posts | My Posts**
- My Posts calls `GET /api/forum/topics/mine`; edit/delete UI only in My Posts view

## Consequences

- Clearer information architecture: My Posts = `community_post WHERE author = me`
- Sidebar has room for readable tab labels
- New Post button stays in All Posts view, not My Posts

## Alternatives considered

- Dedicated `/forum/my-posts` route — rejected for now; filter is sufficient at current scale
- Profile page section for posts — possible future addition, not replacement for filter
