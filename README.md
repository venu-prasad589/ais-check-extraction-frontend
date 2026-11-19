# frontend

Web application of the Morgan & Morgan Intelligent Check Extraction (scope document V1.5),
built from `AIS Check Extraction - Website Mockup_9.html`.

- Next.js 16 (App Router), TypeScript, Tailwind 4, as in the scope's technology stack.
- The styles are the mockup's CSS, copied unchanged into `app/globals.css`, so the screens look like the
  approved mockup. Tailwind is loaded underneath it.
- Real data only: every screen reads and writes through the API in `backend/api` (no sample data).
- The browser talks only to this server. `/api/*` is forwarded to the API (`next.config.ts`, `API_URL`),
  so the sign-in cookie stays on one origin and is never readable by JavaScript.

## Screens

| Route | Tab | Who |
|---|---|---|
| `/login` | Sign-in, and the new-password form after a temporary password | everyone |
| `/upload` | Upload Checks: drag-and-drop PDFs, Split › OCR › Classify › Extract per file | Reviewer, Administrator |
| `/review` | Review: classification, extraction and duplicate-file items, Start Review | Reviewer, Administrator |
| `/results` | Results: From / To calendar, status filters, search, Export Excel | Reviewer, Administrator |
| `/dashboard` | Dashboard: totals for a date range | Reviewer, Administrator |
| `/batches` | Batches, plus files in Error with Retry | Administrator |
| `/ocr`, `/classification`, `/extraction` | Monitoring lists | Administrator |
| `/admin` | System Admin: users, roles, temporary passwords, unlock, deactivate, settings, activity | Administrator |
| `/developer` | Developer Portal: Granite prompt versions, field rules, history | Administrator |

The tabs a Reviewer must not see are hidden here, and the API refuses those requests as well (BR-02).

Times and "today" are shown in the business time zone (`NEXT_PUBLIC_APP_TIMEZONE`, default
`America/Chicago`), because the Dallas date a file was processed decides which day a check belongs to.

## Running

Node.js 24 is installed per user on the VM (`%LOCALAPPDATA%\Programs\nodejs`).

    cd frontend
    npm install                 # once
    npm run dev                 # development, http://localhost:3000
    npm run build && npm start  # production

The API must be running (`backend/README.md`, "Web API"). Another address for the API:
`API_URL=http://<api-host>:8100 npm run build` (it is read when the app is built and started).

## Files

| Path | What it is |
|---|---|
| `app/login/page.tsx` | Sign-in and first-sign-in password change |
| `app/(app)/layout.tsx` | Top bar and tabs per role; sends signed-out users to `/login` |
| `app/(app)/<tab>/page.tsx` | One file per tab |
| `components/review.tsx` | Review dialogs (classification, extraction, duplicate), 15-minute lock, next item |
| `components/viewer.tsx` | Page image (MICR line blacked out by the API), outlined uncertain fields, rotate |
| `components/daterange.tsx` | From / To calendar of the mockup |
| `components/queue.tsx` | Shared layout of the Classification and Extraction tabs |
| `components/modal.tsx`, `components/providers.tsx` | Dialog frames; signed-in user, review counter, toasts |
| `lib/api.ts`, `lib/types.ts`, `lib/format.ts` | API calls, response shapes, formatting |
| `public/ais-logo.png` | AIS logo (from `frontend_old`) |

The earlier front end (Vite + React, for the archived Claude-based API) is in `../frontend_old`; it is not used.
