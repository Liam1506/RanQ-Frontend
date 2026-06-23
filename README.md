### 🔗 [Backend Repository](https://github.com/HaiTzung/RanQ)

# ranq

A web-based polling platform for the DHBW community. Users can create polls (rankings, posts, quotes), vote, comment, search, and browse a community feed. Admins can approve submitted polls before they go live.

**Live site:** https://ranq.dev

---

## Tech stack

- [Astro 7](https://astro.build) — file-based multi-page app, static output
- Vanilla TypeScript — all client-side interactivity, no JS framework
- Plain CSS — per-feature stylesheets, design tokens in `variables.css`
- [Vitest](https://vitest.dev) + [happy-dom](https://github.com/capricorn86/happy-dom) — unit tests
- Node.js >= 22.12.0

---

## Setup

```bash
npm install
```

Create a `.env` file at the root:

```
PUBLIC_API_BASE_URL=http://localhost:5001
```

```bash
npm run dev      # dev server at http://localhost:4321
npm run build    # production build → dist/
npm run preview  # serve dist/ locally
npx astro check  # type-check without building
```

The `PUBLIC_API_BASE_URL` variable is baked in at build time. It must be set before running `npm run build`.

---

## Backend

All API communication goes through a single REST backend. Endpoints are centrally defined in `src/config/api.ts`.

**Base URL:** configured via `PUBLIC_API_BASE_URL`  
**Auth:** `Authorization: Bearer <token>` header on all protected requests

| Group | Endpoints |
|---|---|
| Auth | login, register, logout, verify, status, dev-login |
| Profile | change username, change password, delete account |
| Polls | feed, search, getById, neighbors, bulkStats, create, delete, vote, redditVote, comment, getAllComments, deleteComment, approvePoll, like, getUnapproved, getMyPolls |
| Settings | get, update, cleanup, stats |
| Users (admin) | list, toggleAdmin, toggleVerified, delete |
| Notifications | list |

---

## Authentication

Auth state is stored entirely in client-side cookies: `userId` (the Bearer token), `verified`, `isAdmin`, `isOwner`.

**Login** — POSTs username + password to `/api/auth/login`. On success sets all four cookies and redirects to `/`. If the server returns `detail: "Unverified"`, redirects to `/verify` instead.

**Signup** — POSTs email + username + password to `/api/auth/register`. Sets `userId` and `verified=false`, then redirects to `/verify`.

**Email verification** — The link in the verification email contains a `?token=` query param. The verify page POSTs that token to `/api/auth/verify` and sets `verified=true` on success. A "reload" button re-checks status via `/api/auth/status`.

**Logout** — Deletes all four cookies client-side and redirects to `/login`. No server call needed.

**Route guard** — The root `index.astro` runs `router.ts` on load, which redirects based on cookie state:
- `userId` + `verified=true` → `/start`
- `userId` + `verified=false` → `/verify`
- no `userId` → `/login`

Every protected page script also starts with `if (!userId) window.location.replace("/login")`.

**Dev login** — `/api/auth/dev-login` (backend debug mode only) sets all cookies without credentials.

---

## Pages

| Route | Purpose |
|---|---|
| `/` | Entry point — runs router redirect |
| `/login` | Login form |
| `/signup` | Registration form |
| `/verify` | Email verification |
| `/logout` | Clears cookies and redirects |
| `/start` | Main feed — sorted polls, filtering, infinite scroll |
| `/poll?id=` | Poll detail — voting, comments, up/down score, share, fullscreen |
| `/create` | Create a ranking poll, post, or quote |
| `/search` | Search polls by question or creator |
| `/settings` | Theme, profile, password, account deletion, my polls |
| `/admin` | Moderation queue, site settings, stats charts |
| `/users` | Admin user management |
| `/datenschutz` | Privacy policy |
| `/impressum` | Legal notice |

---

## Browser APIs

| API | Used for |
|---|---|
| `Notification` | Push-style in-app notifications polled every 15s |
| `Notification.requestPermission()` | Requested on login and signup |
| `navigator.clipboard.readText()` | Paste button on create form (post/quote body) |
| `Fullscreen API` | Fullscreen toggle on poll detail page |
| `Web Share API` | Share button on poll detail page |
| `Intersection Observer` | Infinite scroll sentinel on feed, search, settings |
| `localStorage` | Theme preference (`light` / `dark` / system) |
| `sessionStorage` | Scroll position restore on feed; optimistic vote patches |
| `History API` | Back button and URL updates on poll detail |
| `requestAnimationFrame` | Smooth bar width transitions after voting |
| `AudioContext` | Synthesised sound effects in the trailer |

---

## Tests

Tests use [Vitest](https://vitest.dev) with a [happy-dom](https://github.com/capricorn86/happy-dom) environment. All test files live next to the code they test.

```bash
npm test              # run all tests once
npm run test:watch    # watch mode
```

**83 tests across 10 files:**

| File | Tests | Covers |
|---|---|---|
| `src/utils/cookies.test.ts` | 9 | `getCookie`, `setCookie`, `deleteCookie`, expiry, collision handling |
| `src/utils/format.test.ts` | 13 | `escapeHtml` (XSS), `formatDate` |
| `src/utils/notifications.test.ts` | 6 | Polling guards, fetch auth header, notification display, error resilience |
| `src/config/api.test.ts` | 8 | All endpoint URLs resolve correctly against base URL |
| `src/scripts/router.test.ts` | 4 | Cookie-based redirect logic |
| `src/scripts/logout.test.ts` | 5 | Cookie clearing, redirect to `/login` |
| `src/scripts/login.test.ts` | 6 | Success flow, unverified redirect, error messages, loading state |
| `src/scripts/signup.test.ts` | 5 | Success flow, field errors, fallback error message, request body |
| `src/scripts/create.test.ts` | 11 | Form validation (empty fields, option count, body length limits), maintenance mode, add/remove options |
| `src/scripts/search.test.ts` | 16 | `renderCard` for all poll types, XSS escaping, truncation, voted state, overflow, no-results |

---

## CI/CD

Defined in `.github/workflows/deploy.yml`. Triggered on every push to `main` and via manual dispatch.

```
test → build → deploy
```

1. **test** — runs `npm test`; pipeline fails if any test fails
2. **build** — runs `npm run build` with `PUBLIC_API_BASE_URL=https://ranq.haitzung.com`; uploads `dist/` as a Pages artifact
3. **deploy** — publishes the artifact to GitHub Pages at https://ranq.dev

All jobs run on `ubuntu-latest` with Node.js 22.

---

## Project structure

```
src/
├── config/
│   └── api.ts          # all backend endpoint URLs
├── layouts/
│   ├── AuthLayout.astro
│   └── BaseLayout.astro
├── pages/              # file-based routes (14 pages)
├── scripts/            # per-page TypeScript modules (14 files)
├── styles/             # per-feature CSS + variables.css
└── utils/
    ├── cookies.ts
    ├── format.ts
    └── notifications.ts
public/                 # static assets served from /
```
