# MusicTalks Frontend

Next.js 16 (App Router) + React 19 + Tailwind CSS 4 app for the MusicTalks UI: Forum, Theory, Account, and Admin.

> **Design docs (project root):** [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) · [../docs/DATA_MODEL.md](../docs/DATA_MODEL.md) · [../docs/API.md](../docs/API.md)

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The backend must be running (see [../backend/README.md](../backend/README.md)) and seeded, or Theory topics will have no standard definitions.

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Backend API base URL |

Create `.env.local` in this directory to override it.

## Folder structure

There is no `src/`, `lib/`, or global state library — everything lives under `app/`, and pages are client components that call the backend with `fetch`.

```
app/
├── layout.tsx, page.tsx, globals.css   Root layout, home page, Tailwind entry
├── forum/                              /forum — page plus forum-only types and the comment thread
├── theory/                             /theory/* — one folder per domain route + the topic catalog (see theory/README.md)
├── account/  contact/                  /account, /contact pages
├── admin/                              /admin/* pages (thin wrappers around components/admin/*)
├── components/
│   ├── theory/                         TheoryDomainPage (shared by all 6 domains), topic detail, AI panel
│   ├── admin/                          AdminShell (admin guard + nav) and one component per admin page
│   ├── account/                        Login, register, dashboard, learning-style preferences
│   ├── home/  contact/                 Page-specific pieces
│   └── navbar.tsx                      Global navigation
├── hooks/useUserTimezone.ts            Re-renders timestamps when the timezone preference changes
├── utils/                              Auth headers, date/timezone formatting, client-side form validation
└── constants/deletedUser.ts            Tombstone label for deleted authors (mirrors backend/src/constants)
```

Conventions:

- **Route-specific code stays with its route** (`forum/forumTypes.ts`, `theory/*Data.ts`); shared UI goes in `components/<area>/`.
- **Auth** is a JWT plus a user object in `localStorage`; `utils/apiAuth.ts` builds the `Authorization` header. Admin pages rely on `AdminShell` to check the role through `GET /api/admin/me` — the backend enforces it regardless.
- **Validation** in `utils/registerValidation.ts` and `utils/loginValidation.ts` mirrors `backend/src/utils/` for instant feedback; the backend copy is authoritative.
- `components/theory/TheoryComingSoon.tsx` is currently unused (all six domains are live) and kept for future domains.

## Routes

| Path | File | Notes |
|------|------|-------|
| `/` | `app/page.tsx` | Home |
| `/forum` | `app/forum/page.tsx` | Discussion + Community tabs, My Posts filter |
| `/theory` | `app/theory/page.tsx` | Redirect → `/theory/notation-reading` |
| `/theory/<domain>` | `app/theory/<domain>/page.tsx` | Six domains, each rendering `TheoryDomainPage` |
| `/theory/scales` | `app/theory/scales/page.tsx` | Legacy redirect → `/theory/pitch-scales-keys` |
| `/account` | `app/account/page.tsx` | Auth + settings |
| `/contact` | `app/contact/page.tsx` | Contact form (no submit handler yet) |
| `/admin`, `/admin/{forum,users,theory,learning,learning-table}` | `app/admin/**/page.tsx` | Admin only |

## Scripts

- `npm run dev` — development server (port 3000)
- `npm run build` — production build
- `npm run lint` — ESLint

No test runner is configured yet.
