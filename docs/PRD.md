# Career Records Of India (Croin) — PRD

## Original problem statement

User uploaded `27-4-emergent-ankur-main.zip` (full-stack codebase). Asked to:
1. Understand the codebase.
2. Set up & run the app in this environment.
3. Address the UX audit (`CROIN_UX_AUDIT.md`) — and ship production-ready from the agent side with no further suggestions.
4. (Session 2) Apply: Awwwards #1 (ink-reveal tree entrance), Mount Footer in Contact/Submit, Harden admin auth (bcrypt + JWT).

## Architecture

- **Frontend:** React 18 + Vite 5 + Tailwind 3 + Framer Motion + React Router 7 + Fuse.js + lucide-react.
  - Dev server: `yarn start` on port 3000 (`vite --host 0.0.0.0 --port 3000`).
  - Uses `VITE_API_URL` from `.env` (set to `REACT_APP_BACKEND_URL`).
- **Backend:** FastAPI, file-based JSON storage in `/app/backend/data/*.json`.
  - Supervisor runs `uvicorn server:app --host 0.0.0.0 --port 8001 --workers 1 --reload`.
  - Auth: bcrypt + PyJWT (HS256, 24h). Brute-force protected.

## User personas

- **Students** (10th → first job): streams, college choices, early career direction.
- **Livelihood earners** (0–5 yrs / 5–10 yrs / switches / money).
- **Lurkers**: just want to watch clips without self-identifying.
- **Admin**: editor for tree, videos, layout, site settings.

## Core requirements (static)

- Real career journeys of Indians, documented (not advised).
- Interactive zoomable tree + timestamped YouTube interview clips.
- Private-by-default: no cookies, bookmarks/last place saved to `localStorage`.
- Honest forms — submissions hit real endpoints and persist.
- Admin panel for tree/video/journey management — real bcrypt + JWT auth.

### Session 3 — Code review fixes (Apr 27, 2026)
- **Critical: Deleted `src/components/Video/VideoRain.jsx`** — dead code with broken syntax (missing `return` from `useMemo`, stray brace, premature `export default`); not imported anywhere; the surviving sibling `VideoRainSidebar.jsx` is what's actually used.
- **Empty catch blocks → logged**: replaced 23 silent `} catch {}` blocks across HomePage, AdminPanel, NodeShapesPanel, Navbar, CookieNotice, JourneyMapper, InteractiveTimeline with `catch (e) { console.debug(...) }` so storage/network failures are now visible during dev without affecting prod UX.
- **False positives reviewed and intentionally left:**
  - `scripts/v2-ui-debug.cjs` "eval" findings — actually `page.$$eval()` Playwright methods; not JavaScript `eval()`; safe and not part of the production bundle.
  - `server.py:602` `is not None` — correct PEP-8 idiom for None comparison; using `==` here would be wrong style.
  - `array index as key` in `InteractiveTimeline.jsx` (lines 577/680/681/823/2313), `AdminPanel.jsx` (1007/2001/2205) and `NodeShapesPanel.jsx` (127/273/589/633) — all are static SVG decorations or position-indexed lists that never reorder; per React docs index keys are correct in this scenario.
  - `localStorage` for tokens — current Bearer + JWT in `localStorage` is industry-standard for SPAs; switching to `httpOnly` cookies requires a server-managed session layer and per-route cookie auth, which is a significant architectural change. Documented as a future hardening task.
  - Component splitting (InteractiveTimeline 3052 LOC, AdminPanel 2553 LOC) and complexity refactors — high regression risk for a working app; left as P1 backlog.
  - Missing hook dependencies — most flagged ones are intentional (run-once mount effects with `// eslint-disable-line react-hooks/exhaustive-deps`); the static analyzer can't see those comments.

## What's been implemented

### Session 1 — Setup + UX-audit forms + autocomplete + tree progress (Apr 27, 2026)
- **Environment bring-up:** replaced scaffold with uploaded codebase; yarn install; backend deps installed via existing `requirements.txt`. Supervisor running both services.
- **`POST /api/contact`** (Pydantic + email regex; persists to `data/contact.json`).
- **`POST /api/newsletter`** (Pydantic + dedupe; persists to `data/newsletter.json`).
- **ContactPage** wired with real fetch + `aria-live` error.
- **Footer newsletter** wired with real fetch + loading state.
- **Navbar search autocomplete** — top-6 fuzzy-scored matches, breadcrumbs, keyboard nav, Enter jumps to node.
- **Live tree-exploration hairline** under navbar; tracks visited nodes in localStorage; always visible in tree variant.
- **HomePage deep-link robustness** — URL `?path=` no longer wiped on reload.
- **Data helpers** — `getCareerPathMap()` for breadcrumbs.
- Pre-existing **Quote takeover at segment end** (Awwwards #2) confirmed already in `VideoLibrary.jsx`.

### Session 2 — Awwwards #1, Footer mounted, Admin auth hardened (Apr 27, 2026)
- **Ink-reveal tree entrance (Awwwards #1):** one-shot 1100ms cinematic gold scan-line + scrim + grain runs once on first mount of the tree; respects `prefers-reduced-motion`. Verified via `data-testid="tree-ink-reveal"`.
- **Footer mounted on user-facing pages:**
  - **ContactPage** — Footer renders below the form, accessible via natural scroll inside `page-scroll-below-nav`.
  - **SubmitJourneyPage** — outer wrapper changed to `overflow-y-auto`; JourneyMapper given `min-height: calc(100dvh - var(--nav-height))`; Footer below.
  - Newsletter signup is now genuinely visible to end users.
- **Admin auth hardened (production-ready):**
  - **bcrypt** password hashing (rounds=10), supports both `$2a$` and `$2b$` prefixes.
  - **PyJWT** access tokens (HS256, 24-hour expiry, signed with `JWT_SECRET`).
  - **`get_current_admin`** FastAPI dependency reads `Authorization: Bearer <token>`.
  - **Idempotent seed** from `ADMIN_USER` / `ADMIN_PASS` env vars on startup if `admin.json` is missing.
  - **Brute-force protection** — 5 failed attempts per `ip:username` (X-Forwarded-For aware) → HTTP 429 lockout for 15 minutes.
  - **Endpoints:** `/api/auth/login`, `/api/auth/me`, `/api/auth/change-password`, `/api/auth/forgot-password`, `/api/auth/reset-password`, `/api/auth/logout`.
  - **Forgot-password:** URL-safe 24-byte token, 15-min TTL, single-use; reset link logged to stdout (SMTP not wired).
  - `.env` updated with `JWT_SECRET`, `ADMIN_USER`, `ADMIN_PASS`.

## UX-audit items status

| Audit # | Status |
|---|---|
| #1 `transition: all` sweep | already done in uploaded code |
| #2 Delete `style.css` | already done |
| #5 KineticSidebar cyan + labels | already done |
| #7 JourneyMapper 6→4 steps + native select removed | already done |
| #8 Real `/api/contact` + `/api/newsletter` | ✅ done (session 1) |
| #9 OfflineBar muted tokens | already done |
| #10 Toast caps | already done |
| #11 CookieNotice visibility | already done |
| Awwwards #1 Ink-reveal tree entrance | ✅ done (session 2) |
| Awwwards #2 Quote takeover | already done |
| Awwwards #4 Search autocomplete | ✅ done (session 1) |
| Awwwards #9 Live tree progress hairline | ✅ done (session 1) |
| Footer mounted on Contact + Submit | ✅ done (session 2) |
| Admin auth hardening (bcrypt + JWT + brute force) | ✅ done (session 2) |
| #12 Split InteractiveTimeline | deferred (3052 LOC; velocity bug, not UX bug) |
| OG image generator | not started |

## Files changed (sessions 1+2)

- `/app/backend/.env` — added `JWT_SECRET`, `ADMIN_USER`, `ADMIN_PASS`.
- `/app/backend/server.py` — contact/newsletter + full auth stack (bcrypt, JWT, brute force, seed).
- `/app/frontend/src/pages/ContactPage.jsx` — real fetch + Footer mounted.
- `/app/frontend/src/pages/SubmitJourneyPage.jsx` — scrollable layout + Footer mounted.
- `/app/frontend/src/components/UI/Footer.jsx` — real newsletter fetch + loading state.
- `/app/frontend/src/components/UI/Navbar.jsx` — autocomplete + tree progress hairline (~120 LOC).
- `/app/frontend/src/components/Interactive/InteractiveTimeline.jsx` — ink-reveal entrance overlay.
- `/app/frontend/src/pages/HomePage.jsx` — passes `careerPaths` + `onGotoOption`; seeds currentPath on deep-link.
- `/app/frontend/src/data/careerVideos.js` — `getCareerPathMap()` helper.
- `/app/CROIN_UX_AUDIT.md` copied in for reference.
- `/app/memory/PRD.md`, `/app/memory/test_credentials.md` written.

## Verified

- Backend curl matrix:
  - `/api/auth/login` (success + 401 + 429 brute force).
  - `/api/auth/me` (valid + 401 on bad/missing token).
  - `/api/auth/change-password` → new token; old password no longer works.
  - `/api/auth/forgot-password` + `/api/auth/reset-password` (reset token TTL + single-use enforced).
  - `/api/contact` + `/api/newsletter` (valid, dedupe, 422 invalid).
- Frontend Playwright matrix:
  - Deep-link `?path=student,s_10th_decision,s_science` → tree renders + hairline shows 8%.
  - Search autocomplete on "science" / "commerce" → breadcrumb dropdown + Enter-jump.
  - Ink-reveal `[data-testid="tree-ink-reveal"]` visible at 350ms, gone at 1100ms.
  - Contact form submit → backend record created.
  - Footer newsletter on Contact page → backend record created.
  - Admin panel `/admin` with stored JWT → full Dashboard renders (Total Nodes 37, 7 tabs).
- Lint: ruff + ESLint both green on every modified file.
- Supervisor: all services RUNNING.

## Backlog (not blocking)

- **P1** Split `InteractiveTimeline.jsx` (3052 LOC) and `AdminPanel.jsx` (2553 LOC) into smaller files.
- **P2** Connector data-flow spark every 8s on visited connectors.
- **P2** "Reduce noise" toggle mapped to `prefers-reduced-motion` + `prefers-reduced-data`.
- **P2** OG image generator for shared deep-link previews.
- **P2** Admin mutation endpoints (PUT/PATCH/DELETE for tree edits) with `Depends(get_current_admin)`.
- **P3** Wire SMTP (SendGrid/Resend) so the forgot-password reset link actually emails.

## Setup

- Backend: deps already in `requirements.txt`; no manual install needed.
- Frontend: `yarn install` in `/app/frontend`.
- Env (`/app/frontend/.env`): `REACT_APP_BACKEND_URL=<preview url>`, `VITE_API_URL=<same preview url>`.
- Env (`/app/backend/.env`): `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`, `JWT_SECRET`, `ADMIN_USER`, `ADMIN_PASS`.
- Supervisor: backend on 8001, frontend on 3000.

## Next action items

- If/when SMTP is wired, replace the stdout log line in `auth_forgot_password` with an actual email send.
- When admin tree-mutation endpoints are added, gate them with `Depends(get_current_admin)`.
- Rotate `JWT_SECRET` in production before going live.
