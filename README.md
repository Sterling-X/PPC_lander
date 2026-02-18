# Landing Page Instruction Generator

A production-oriented Next.js web application that generates a complete Markdown **Landing Page Instruction Document** for Claude to write state-specific family law landing pages.

## 1. Architecture Overview

### Frontend (Next.js App Router)
- `app/page.tsx`
- Single-page form UI with required and optional inputs.
- Client-side validation for required fields and URL format.
- Calls backend API route and renders generated Markdown preview.
- Supports one-click `.md` download.

### Backend (API Route)
- `app/api/generate/route.ts`
- Receives JSON payload, validates required fields, and returns deterministic Markdown output.
- Returns structured validation errors with `400` status when input is invalid.

### Core Domain Logic
- `lib/validators.ts`: Central input validation rules.
- `lib/generator.ts`: Markdown assembly logic, strict section ordering, compliance-safe instruction language.
- `lib/types.ts`: Shared TypeScript types.

## 2. Setup + Run Instructions (Local)

## Prerequisites
- Node.js 18+
- npm 9+

## Install
```bash
npm install
```

## Run Development Server
```bash
npm run dev
```

Open `http://localhost:3000`.

## Build for Production
```bash
npm run build
npm run start
```

Health endpoint:
- `GET /api/health`

## 3. Deploy on the Web

### Option A: Vercel (recommended for Next.js)
1. Push this repository to GitHub.
2. In Vercel, click **Add New Project** and import the repo.
3. Framework preset should auto-detect as Next.js.
4. Click **Deploy**.
5. After deploy, verify:
   - `/` loads the app
   - `/api/health` returns status JSON

Project file used:
- `vercel.json`

### Option B: Docker (Render, Railway, Fly.io, ECS, etc.)
Build image:
```bash
docker build -t landing-page-instruction-generator .
```

Run container:
```bash
docker run -p 3000:3000 landing-page-instruction-generator
```

Then verify:
- `http://localhost:3000`
- `http://localhost:3000/api/health`

Project files used:
- `Dockerfile`
- `.dockerignore`
- `next.config.js` (`output: "standalone"`)

## 4. Required Inputs

1. U.S. State
2. Family Law Practice Area
3. Guidelines Block

Optional firm details:
- Firm name
- City/region
- Phone
- Intake URL
- Attorney bios
- Years in practice
- Differentiators

## 5. Output Contract

The generator always emits this exact section order:
1. Project Summary
2. Audience Persona (Research-Based)
3. State-Specific Compliance Notes
4. Organic SEO Strategy
5. Structured Page Outline for Claude
6. Content Requirements + Do/Don’t Rules
7. Claude Prompt Template (Ready-to-Paste)
8. Acceptance Checklist

## 6. Safety and Compliance Guarantees in Generator

- Explicitly states: informational only, not legal advice.
- Prohibits guarantees and unverifiable claims.
- Prohibits fabricated jurisdiction-specific legal claims.
- Adds **Requires Attorney Verification** markers for legal specifics needing review.
- Avoids unsupported "best/expert/guaranteed" language unless supplied and verifiable.

## 7. Example Input + Output

- Example request payload: `examples/example-input.json`
- Example generated document: `examples/example-output.md`

## 8. Extension Notes (Future Persona Research Automation)

Recommended roadmap:
1. Add optional research adapters for Search Console, CRM notes, and call transcript summaries.
2. Add a confidence score per persona attribute (assumption vs evidence-backed).
3. Add state review workflow with attorney approval state and timestamp.
4. Add persistence layer for versioned document runs and audit trails.
5. Add programmatic schema suggestion validation against actual page blocks.

## 9. Suggested Production Hardening

1. Add auth and rate limiting on `/api/generate`.
2. Add unit tests for validators and output section order.
3. Add structured logging for compliance review and debugging.
4. Add telemetry and user action analytics.
