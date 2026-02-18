# Family Law PPC Landing Studio

Production-ready Next.js app for generating family law PPC landing pages and Google Ads assets from verified firm crawl evidence.

## Quick start

1. Install dependencies

```bash
npm install
```

2. Set environment variable

```bash
export OPENAI_API_KEY=your_openai_api_key
```

3. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Workflow implemented

- `/firms`: list and create firms, plus **Seed demo firm + project**
- `/firms/[id]/crawl`: configure crawl depth/pages and run site crawl
- `/firms/[id]/profile`: view extracted firm profile with citation-backed claims
- `/firms/[id]/usp`: rank candidates and choose primary/support/blocking USPs
- `/projects`: create projects (firm + practice area + state + optional geo)
- `/projects/[id]/inputs`: collect project inputs and upload/paste keyword report CSV
- `/projects/[id]/landing-page`: generate landing page pack, edit sections, regenerate individual sections, validate compliance
- `/projects/[id]/ads`: generate per-ad-group RSA assets, view char counts/pins, run auto-fix
- `/projects/[id]/export`: download landing page markdown and CSV exports

## Data and persistence

- Data is stored in `data/db.json` for MVP (no external DB dependency).
- Crawled pages are cached and reused when still within TTL.
- All generated and curated artifacts are stored under each project record.

## Export formats

- Landing Page: mandatory section order markdown (`Hero → Problem → Types → Guide → Plan → Proof → Objections → Close`) + micro-FAQ block
- Ads CSV:
  - RSA Headlines
  - RSA Descriptions
  - Sitelinks
  - Callouts
  - Structured Snippets

## Safety and constraints implemented

- SSRF hardening for crawler:
  - blocks localhost/private IP ranges
  - blocks non-http(s) schemes (`file`, `ftp`, etc.)
  - same-domain only crawling
  - robots.txt disallow filtering
- Crawler can fall back to shallow crawl when sitemap is unavailable.
- Generation enforces:
  - landing section schema + ordering
- ads schema constraints + pin/character limits validation
- Unverified differentiators are filtered out from selection and not exposed as selected defaults.

## Files of interest

- `lib/openai.ts` — model prompts + schema validation + repair flow
- `lib/crawl.ts` — crawler + crawl safety
- `lib/storage.ts` — local JSON persistence
- `lib/contracts.ts` — Zod schemas and JSON contracts
- `app/api` and `app/*` routes for full wizard flow
- `samples/sample-keywords.csv` — included keyword sample
