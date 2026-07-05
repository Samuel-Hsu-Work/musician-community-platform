# MusicTalks Frontend

Next.js app for the MusicTalks UI (Forum, Theory, Account).

> **Design docs (project root):** [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) · [../docs/DATA_MODEL.md](../docs/DATA_MODEL.md)

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Backend API base URL |

Create `.env.local` in this directory if you need to override the default.

## Routes

| Path | File | Notes |
|------|------|-------|
| `/` | `app/page.tsx` | Home |
| `/forum` | `app/forum/page.tsx` | Discussion + Community tabs |
| `/theory` | `app/theory/page.tsx` | Redirect → notation-reading |
| `/theory/notation-reading` | `app/theory/notation-reading/page.tsx` | Notation & reading topics |
| `/theory/rhythm-meter` | `app/theory/rhythm-meter/page.tsx` | Rhythm & meter topics |
| `/theory/pitch-scales-keys` | `app/theory/pitch-scales-keys/page.tsx` | Pitch symbols + scales |
| `/theory/intervals`, `chords-harmony`, `form-analysis` | `app/theory/*/page.tsx` | Coming soon |
| `/account` | `app/account/page.tsx` | Auth + settings |
| `/contact` | `app/contact/page.tsx` | Contact form |

## Theory data (static catalogs)

These files are the **source of truth** for Theory content — not the database:

| File | Content |
|------|---------|
| `app/theory/theoryDomains.ts` | Top-level Theory curriculum (6 domains) |
| `app/theory/notationData.ts` | 39 notation symbols + sidebar subcategories |
| `app/theory/scaleData.ts` | 24 scales + categories |

Add new symbols or scales here. See [../docs/DATA_MODEL.md](../docs/DATA_MODEL.md).

## Key components

```
app/components/theory/
  theoryNavbar.tsx         — Six top-level domains
  TheoryNotationPage.tsx   — Sidebar + notation detail (per domain)
  TheoryPitchScalesPage.tsx — Pitch symbols + scales combined
  TheoryComingSoon.tsx     — Placeholder for future domains
  notations.tsx            — AI explanation panel
  scales.tsx               — Note + frequency grids
  NotationSymbol.tsx       — Symbol rendering
```

## Scripts

- `npm run dev` — development server (port 3000)
- `npm run build` — production build
- `npm run lint` — ESLint
