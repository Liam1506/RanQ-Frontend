# RanQ — Frontend Maintainer Guide

This document describes the current state of the Astro + TypeScript frontend. It assumes you can read TypeScript and have used Astro before. No migration history, no past decisions — just what's there now and how to keep it working.

---

## 1. Stack at a glance

| Component         | Version / Choice                                |
|-------------------|-------------------------------------------------|
| Framework         | Astro `^6.2.0` (static MPA, no SSR adapter)     |
| Runtime           | Node `>= 22.12.0` (declared in `engines`)       |
| Language          | TypeScript `^5.9.3`                             |
| Type-check tool   | `@astrojs/check` `^0.9.9`                       |
| Test runner       | Vitest `^4.1.8` + `happy-dom` `^20.10.2`        |
| Test UI (opt.)    | `@vitest/ui`                                    |
| Styling           | Plain CSS — one file per page/feature, no preprocessor |
| Bundler           | Whatever Astro ships with (Vite under the hood) |

There is **no React, Vue, Svelte, or any UI framework**. Pages are Astro files (HTML + frontmatter), and interactivity is plain TypeScript modules loaded via `<script src="..."></script>` tags. State is held in module-scope variables and (occasionally) `sessionStorage` / `localStorage`.

---

## 2. Layout

```
Frontend/
├── astro.config.mjs            # `site: 'https://ranq.dev'`, no integrations
├── package.json                # scripts: dev, build, preview, test
├── tsconfig.json               # extends astro/tsconfigs/strict
├── vitest.config.ts            # happy-dom env, includes src/**/*.test.ts
├── .env.example                # PUBLIC_API_BASE_URL=http://localhost:5001
├── public/                     # static assets, served verbatim from /
└── src/
    ├── assets/                 # images imported into Astro (background, logos)
    ├── components/
    │   ├── Logo.astro          # the fixed top-left RanQ logo (theme-aware)
    │   └── icons/              # 5 nav icons + Add/Search/Settings filled variants
    ├── config/
    │   ├── api.ts              # central registry of all backend URLs
    │   └── api.test.ts         # 4 tests covering the registry
    ├── layouts/
    │   ├── BaseLayout.astro    # the main app shell — header, main, floating nav
    │   └── AuthLayout.astro    # the unauthenticated shell — used by login/signup/verify
    ├── pages/                  # Astro file-based routing — one .astro per route
    │   ├── index.astro         # /        — bootstraps router.ts (redirect-only page)
    │   ├── 404.astro           # 404 fallback
    │   ├── login.astro
    │   ├── signup.astro
    │   ├── verify.astro
    │   ├── logout.astro
    │   ├── start.astro         # /start   — main feed
    │   ├── poll.astro          # /poll?id=<uuid> — detail view
    │   ├── create.astro        # /create  — ranking or thought
    │   ├── search.astro
    │   ├── settings.astro
    │   └── admin.astro         # admin moderation queue
    ├── scripts/                # one TypeScript module per page
    │   ├── router.ts           # decides where the user lands on /
    │   ├── login.ts / signup.ts / verify.ts / skip.ts / logout.ts
    │   ├── feed.ts             # the feed on /start
    │   ├── poll.ts             # detail view + comments + likes + voting
    │   ├── create.ts
    │   ├── search.ts
    │   ├── settings.ts
    │   └── admin.ts
    ├── styles/                 # one CSS file per area
    │   ├── variables.css       # design tokens + light/dark themes
    │   ├── global.css          # base styles, reset-ish
    │   ├── baseLayout.css      # the main app shell
    │   ├── auth.css            # login/signup/verify pages
    │   ├── start.css           # feed
    │   ├── poll-card.css       # cards used by feed + detail + my-posts + admin
    │   ├── poll-detail.css     # /poll page-specific
    │   ├── poll-comments.css   # comments section
    │   ├── create.css
    │   ├── search.css
    │   ├── settings.css
    │   └── admin.css
    └── utils/
        ├── cookies.ts          # 3-function cookie helper
        └── cookies.test.ts     # 5 tests
```

**Test count:** 9 (`npm test`).

---

## 3. Setup and run

### 3.1 First-time setup

```bash
cd Frontend
cp .env.example .env
# the default points at http://localhost:5001 which matches the backend's compose
npm install
npm run dev
```

Astro's dev server runs on `http://localhost:4321` by default.

### 3.2 Day-to-day commands

```bash
npm run dev         # dev server with HMR, listens on 4321
npm run build       # type-checks + builds to dist/ (static HTML/CSS/JS)
npm run preview     # serves the built dist/ for a final smoke test
npm test            # vitest run (one-shot, exits after)
npm run test:watch  # vitest watch mode
npx astro check     # type-check Astro + TS files (no build)
```

`build` and `astro check` both go through `@astrojs/check`. A green `astro check` means: no TS errors, no Astro template errors, no missing-prop errors, across the whole tree.

---

## 4. Environment

The single env var is **`PUBLIC_API_BASE_URL`**. Astro requires the `PUBLIC_` prefix to expose a variable to client-side code via `import.meta.env`.

| Variable                | Default                  | Purpose                                              |
|-------------------------|--------------------------|------------------------------------------------------|
| `PUBLIC_API_BASE_URL`   | `http://localhost:5001`  | Where every fetch in the frontend points.            |

Vitest's config also sets this var so tests don't depend on a `.env` file:
```ts
// vitest.config.ts
test: { env: { PUBLIC_API_BASE_URL: "http://localhost:5001" } }
```

To target a different backend (staging, prod), change `.env` and rebuild — the value is baked in at build time.

---

## 5. Architecture

### 5.1 Multi-page app, not SPA

Each route is a separate `.astro` page that renders an HTML shell. The interactive logic lives in a co-located TypeScript module imported via `<script src="../scripts/<name>.ts">`. There is no client-side router and no shared client-side state across routes — navigation is a real browser navigation. Cross-page hand-offs use cookies (auth) or `sessionStorage` (scroll position, optimistic updates).

This means:
- Adding a route = adding a `.astro` file under `pages/`. Done.
- Each script file runs **once**, on its own page, in module scope. There is no central app bootstrap.
- Browsers' bfcache restores the previous page when you click back — the script does **not** re-execute. See § 9 for how the feed handles this.

### 5.2 The `BaseLayout` shell

`BaseLayout.astro` provides:
- `<head>` (charset, viewport, title, theme-init inline script)
- `<header>` with `<Logo />`
- `<main>` containing a max-width 600px `.scroll-wrapper` with the page slot
- `<footer>` with the floating navigation bar — only shown when `showNav={true}` (the default; `admin.astro` and `404.astro` set it to `false`)

The floating nav has 5 items: home / search / add / settings / logout. The current route gets `aria-current="page"` and a **filled** icon variant. See § 7.

### 5.3 The `AuthLayout` shell

`AuthLayout.astro` is the bare-bones layout for unauthenticated pages (login, signup, verify). It includes the `<Logo />` but skips the header bar and the floating nav. Takes a required `title` prop used in `<title>`.

### 5.4 Inline theme bootstrap

Both layouts embed the same one-line script in `<head>`:
```html
<script is:inline>
  const t = localStorage.getItem("theme");
  if (t) document.documentElement.setAttribute("data-theme", t);
</script>
```

`is:inline` keeps it as a literal `<script>` rather than letting Astro bundle/defer it. Critical: this runs **before** any CSS paints, so the theme is set in time and there's no flash. Don't move this into a deferred script.

---

## 6. Authentication on the client

The frontend's auth state is two cookies:

| Cookie       | Value                              |
|--------------|------------------------------------|
| `userId`     | The user UUID (== Bearer token)    |
| `verified`   | `"true"` or `"false"`              |

`utils/cookies.ts` exposes:
```ts
getCookie(name: string): string | undefined
setCookie(name: string, value: string, days = 30): void
deleteCookie(name: string): void
```

The cookie is `path=/; max-age=<days*86400>`. No HttpOnly, no Secure, no SameSite — set from JS, read by JS. The backend doesn't actually read cookies, only `Authorization` headers; the cookie is purely a client-side handle.

### 6.1 Routing logic

`router.ts` (loaded by `index.astro`) is the entry point:

```ts
if (userId && verified === "true") → /start
else if (userId && verified === "false") → /verify
else → /login
```

Each page that requires auth begins its script with the same gate:
```ts
const userId = getCookie("userId");
if (!userId) window.location.replace("/login");
```

The verified flag is **only** set after either `login.ts` (sets to `"true"` after a 200) or `signup.ts` (sets to `"false"` after a 201), or `verify.ts` (set to `"true"` after a successful verify).

### 6.2 Login / signup / verify pages

- `login.ts` — POSTs to `/api/auth/login`, on success sets cookies and redirects to `/`. On `Unverified` it redirects to `/verify` instead. Network errors show inline.
- `signup.ts` — POSTs to `/api/auth/register`, on success sets `userId` + `verified=false`, redirects to `/verify`.
- `verify.ts` — has two roles:
  1. If `?token=<uuid>` is in the URL (the user clicked the email link), POST it to `/api/auth/verify` and redirect to `/login` on success.
  2. Wire up the "↺ reload" button to GET `/api/auth/status?userId=<id>` and use the returned `verified` flag to decide whether to redirect to `/` or stay.
- `skip.ts` — wired up on login + signup. Calls `/api/auth/dev-login` (which only works when the backend has `DEBUG=True`), sets cookies, redirects to `/`. Falls back to `/start` if the call fails (which on the way will hit the userId-gate and bounce back).
- `logout.ts` — deletes both cookies, redirects to `/login`. The `/api/auth/logout` endpoint is **not called** — there is nothing for it to invalidate server-side.

---

## 7. The floating navigation

`BaseLayout.astro` renders 5 anchor tags. Each gets:

- `aria-label` (Home, Search, Add, Settings, Logout)
- `aria-current="page"` when its href matches `Astro.url.pathname`
- A `filled={...}` prop on the icon (skip Logout — it has no destination state)

### 7.1 Icon components

Files: `Frontend/src/components/icons/HomeIcon.astro`, `SearchIcon.astro`, `AddIcon.astro`, `SettingsIcon.astro`, `LogoutIcon.astro`.

Each icon component takes `{ filled = false }` as props and renders one of two SVG variants:
- **outline** — `fill="none" stroke="currentColor" stroke-width="2"`
- **filled** — `fill="currentColor"` (same color as the outline) plus, for `Add` and `Settings`, an SVG `<mask>` that punches a transparent hole through the body so the inner shape (the `+` cross / the gear hub) shows the nav background through.

The Settings filled variant uses a fill-only path with a tighter `viewBox="1 1 22 22"` so its visible footprint matches the stroked outline (the lucide gear path was designed for stroke-only rendering and produces visible artifacts at concave corners when stroked-and-filled).

The Search filled variant simply adds `fill="currentColor"` to the existing outlined `<circle>`.

The Home filled variant uses a different `<path>` (no separate door polyline — the door is cut out of the path itself).

To swap an icon: edit the SVG inside the relevant component. Make sure both variants stay visually balanced (same outer radius — keep the stroke even on filled variants if the outline relies on it).

### 7.2 Nav-bar styling

In `baseLayout.css`:
- `.floating-nav` is a fixed yellow pill at the bottom of the viewport (`--color-nav-bg` is always `#e2b714`, even in dark mode)
- `.floating-nav a` inherits `--color-nav-icon` (always `#1e1e1e`, even in dark mode)
- The active link has no special background — the filled icon **is** the indicator

Don't apply `color: var(--color-text)` to the active link — the icons must stay dark on the yellow nav regardless of theme. There is no `::after` dot indicator anymore.

---

## 8. Theme handling

### 8.1 The system

- Tokens are defined in `styles/variables.css` under `:root` (light defaults), `@media (prefers-color-scheme: dark)`, `[data-theme="light"]`, and `[data-theme="dark"]`.
- `[data-theme="..."]` selectors are intended to match the `<html>` element. **Never** use `data-theme` as a custom attribute on any other element — the variable selectors will match it and locally override CSS custom properties on that element. (This was the original cause of the buttons in the settings being unreadable; the buttons used `data-theme` which collided with the global selectors, so they were renamed to `data-theme-choice`.)

### 8.2 The chooser

`/settings` has a `appearance → theme` segmented control with three buttons: `light` / `dark` / `system`. Implementation in `settings.ts`:

- `currentTheme()` reads `localStorage.theme` and returns `"light" | "dark" | "system"`.
- `applyTheme(theme)`:
  - `"system"` → `localStorage.removeItem("theme")` and `document.documentElement.removeAttribute("data-theme")` (so the OS preference takes over via the `@media` query)
  - else → `localStorage.setItem("theme", theme)` and `document.documentElement.setAttribute("data-theme", theme)`
- The buttons read `data-theme-choice="..."` (NOT `data-theme`).

The inline bootstrap in each layout reads `localStorage.theme` and applies it to `<html>` before paint. So changes persist across pages without the `applyTheme` import.

### 8.3 Tokens to know

In dark mode `--color-text` is `white` and `--color-bg` is `#1e1e1e`. In light mode they swap. The accent (`--color-accent`) is the same yellow `#e2b714` in both modes. `--color-nav-bg` and `--color-nav-icon` are theme-independent (always yellow + dark) since the nav is a constant.

---

## 9. The feed (`/start`)

The most complex page. Lives in `start.astro` + `feed.ts` + `start.css` + `poll-card.css`.

### 9.1 Data shape

```ts
type Poll = {
  id: string;
  kind: "ranking" | "post";
  question: string;
  body: string;                       // only used for posts
  created_by: string;                 // UUID
  creator_username: string | null;
  created_at: string | null;
  approved: boolean;
  voted_option_id: string | null;     // current user's vote, if any
  comment_count: number;
  like_count: number;                 // posts only
  user_has_liked: boolean;            // posts only
  options: Array<{ id: string; option: string; votes: number }>;  // empty for posts
};
```

Module-scope state:
```ts
let allPolls: Poll[] = [];                  // unfiltered, as fetched
let showUnvoted = false;                    // "not voted" toggle
let typeFilter: "all" | Kind = "all";       // tab filter
let initialRender = true;                   // animate-in only on first render
```

### 9.2 Render strategy — patch in place, never wipe

`applyFilters()` is the workhorse. Critically, it **reuses existing DOM nodes** instead of `innerHTML = "..."`. The flow:

1. Compute the filtered + sorted list from `allPolls`.
2. Build a `Map<pollId, HTMLAnchorElement>` of existing cards (queried by `[data-poll-id]`).
3. Drop any feed-error / feed-loading / feed-empty placeholders.
4. For each poll in the filtered list:
   - Lookup an existing card by id.
   - **If found:** call `patchCard(card, poll)` — swap the inner `innerHTML`. For rankings, restart the bar transition (set width 0, then in the next frame set the target percent). The outer `<a>` element is preserved.
   - **If not found:** call `buildCard(poll)`. Animate-in via CSS `cardIn` (only on `initialRender === true`).
   - Either way, `feed.appendChild(card)` — this is a **DOM move** when the element already exists, which is much cheaper than destroy/create and preserves event listeners and CSS animation state.
5. Anything left in the existing-map (still on the page but not in the new filtered list) is removed.
6. `initialRender = false`.

The result: voting on a card transitions the bars from old % to new %, no flash, no reload. Switching filters reuses the same cards if they remain visible.

### 9.3 Refresh on comeback

Two listeners trigger a silent refetch:

```ts
window.addEventListener("pageshow", (e) => {
  if (e.persisted) refreshFeed();   // bfcache restore (browser back)
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && allPolls.length > 0) {
    refreshFeed();
  }
});
```

`refreshFeed()` first applies any pending `sessionStorage` updates (see § 9.4) and re-renders, then fetches `/getAll` and re-renders again. Because of the in-place patching, this looks like a smooth update, not a reload.

### 9.4 Optimistic hand-off via `sessionStorage`

The detail page (`poll.ts`) writes vote / like / comment changes to `sessionStorage["pendingPollUpdates"]` (a JSON object keyed by poll id). The feed reads and clears that key on load (and inside `refreshFeed`):

```ts
const updates: Record<string, Partial<Poll>> = JSON.parse(raw);
Object.entries(updates).forEach(([id, patch]) => {
  const idx = allPolls.findIndex((p) => p.id === id);
  if (idx === -1) return;
  allPolls[idx] = { ...allPolls[idx], ...patch };
});
```

This means: even if the silent refetch is slow (or hasn't returned yet), your own change is reflected immediately when you land on the feed.

### 9.5 Filter row behaviour

Order in the DOM (from `start.astro`):
```
[ all | rankings | thoughts ]   not-voted   ........   sort-dropdown
```

- `.type-tabs` is a 3-way exclusive segmented control (`data-type="all|ranking|post"`).
- `#filter-unvoted` is a button (toggle on/off). Hidden via the native `hidden` attribute when `typeFilter === "post"` (the button only makes sense for rankings); also reset to off when hidden.
- `#filter-sort` is a `<select>` pushed to the right via `margin-left: auto` (set in `start.css`).

### 9.6 Card variants

`poll-card.css` is shared across the feed, the detail page, the my-posts list in settings, and the admin queue.

- `.poll-card` is the base anchor, padding `1.6rem 0`, divider on the bottom, hover opacity drop.
- `.poll-card--detail` is a non-clickable variant on `/poll`.
- `.poll-card--post` is the post variant — same styles, just used for namespacing in the future if needed.
- `.poll-options--ranked` is the detail-page list (with rank numbers); the feed uses plain `.poll-options` (no rank numbers, just bars).
- `.poll-option--voted` adds a 2px yellow border around the bar (no fill). This replaces a previous solid-fill design that had contrast issues.
- `.poll-option--leader` highlights the top option on the detail page.

---

## 10. Poll detail page (`/poll`)

`poll.astro` is two empty containers; `poll.ts` does all the rendering. `?id=<uuid>` query param identifies the poll. The "← back" button is prepended to the page in JS, calling `history.back()`.

### 10.1 Module-scope state

```ts
let currentPoll: Poll | null = null;
let rankingListEl: HTMLUListElement | null = null;
let rankingMetaEl: HTMLElement | null = null;
let currentComments: Comment[] = [];
let commentListEl: HTMLUListElement | null = null;
let commentHeadingEl: HTMLElement | null = null;
```

These references let later actions (vote, like, comment) update specific elements in place — no full re-render.

### 10.2 Loading

`loadPoll()` calls `/api/polls/getAll` (yes, the full list — not `getById`), finds the poll by id, and renders. If you ever care about the cost of fetching the full feed on the detail page, you can switch to `/api/polls/getById?id=<uuid>` (which exists in `api.ts` as `API.polls.get` is for `?question=...`; you'd need to add a key for `getById`).

### 10.3 Ranking detail

`applyRanking({ animateFromZero })` is the in-place renderer for the options list:

- Indexes existing `<li>` rows by `data-opt-id`.
- For each option in the new sorted order, either reuses the existing row (just updates rank text, percent, count, voted/leader classes, bar width) or creates a new one and wires the click handler to `castVote(opt.id)`.
- Re-appends every li in the new order — DOM move, not destroy.
- Sets `bar.style.width = "0"` first (only when `animateFromZero` or after a vote), then schedules the target widths via two nested `requestAnimationFrame` calls so the transition catches.

`castVote(optionId)` does the optimistic update (mutate `currentPoll.options` and `currentPoll.voted_option_id`), calls `applyRanking()`, stages the change to `sessionStorage`, then POSTs `/api/polls/vote`. On error, calls `loadPoll()` to refetch authoritative state.

### 10.4 Post detail

Posts get the body text and a like button (`renderLikeRow`). The like button shows count + "like"/"likes" word; the heart icon was removed in favour of a clean count. Clicking does an optimistic flip of `user_has_liked` and `like_count`, stages it to sessionStorage, POSTs `/api/polls/like`, and rolls back on error.

### 10.5 Comments

`loadComment(pollId)` POSTs to `/api/polls/getAllComments` and renders the section into `#poll-comments`. `renderCommentItem(c)` builds one `<li>` with `@username` author + content. The heading shows `<n> comment(s)` (no emoji).

`createComment` POSTs `/api/polls/comment`, gets back the new comment with the username already resolved, prepends it to the list (since the list is sorted newest-first), and updates the heading. No refetch needed.

---

## 11. Create page (`/create`)

`create.astro` + `create.ts`. Two-mode form:

### 11.1 Toggle

`.kind-toggle` has two buttons: `data-kind="ranking"` and `data-kind="post"`. The active one gets `.active` (yellow background) and `aria-selected="true"`.

`setKind(next)` toggles the tabs, hides/shows `#ranking-fields` and `#post-fields` via the `hidden` attribute, swaps the first input's label between `question` and `title`, and swaps its placeholder.

### 11.2 The two modes

- **ranking** — question + ≥2 options. `.options-list` starts with two `<input>`s. `+ add option` appends a new `<input>`, `− remove option` removes the last one but never goes below 2. On submit, blank options are filtered out before validation.
- **thought** (kind="post") — title + body textarea. Validated for non-empty body.

### 11.3 The `.field` wrapper

`.field` is a flex column with a `.field-label` above each input/textarea. Both `#ranking-fields` and `#post-fields` are `.field`. **Critical CSS rule:**
```css
.field { display: flex; flex-direction: column; gap: 0.5rem; }
.field[hidden] { display: none; }
```

Without the second rule, `display: flex` overrides the `[hidden]` attribute's default `display: none` and both sections render at once. If you add a new `.field` div with a `hidden` attribute and it doesn't hide, this is why.

### 11.4 Submission

`fetch(API.polls.create, { method: "POST", body: { kind, question, options? | body? } })` — on **201** redirects to `/start`. The new poll is unapproved by default and will not show in the feed until an admin approves it.

---

## 12. Settings page (`/settings`)

`settings.astro` + `settings.ts` + `settings.css`. Three sections, each a `<section class="settings-section">` with a small lowercase header (`<h2 class="settings-section-title">`) and a divider underneath.

### 12.1 `appearance`

Theme segmented control. See § 8.2.

### 12.2 `account`

Pulls `/api/auth/status?userId=<id>` on load and shows:
- `username` as `@<handle>`
- `email` verbatim
- A `log out` button styled with `.settings-action-danger` (yellow border, turns red on hover) — it's actually an `<a href="/logout">`.

### 12.3 `my posts`

Filter row: `[all | rankings | thoughts]` + `unapproved only` toggle. The card renderers (`renderRankingCard`, `renderPostCard`) each include a `delete` button. `deletePoll(id)` calls `/api/polls/delete` and on success removes the poll from `allPolls` and re-renders — no refetch.

`/api/polls/getMyPolls` returns all polls the current user created (including unapproved). The frontend's filter is purely client-side.

---

## 13. Search page (`/search`)

`search.astro` + `search.ts`. Pre-fetches `/api/polls/getAll` once on load and renders all polls into `#post-list` with `class="post-wrapper hidden"` (initially all hidden). Each wrapper carries `data-question` and `data-username`.

The input listener:
- Trims and lowercases the query.
- If it starts with `@`, strips the `@` so typing `@alice` matches username `alice`.
- For each wrapper: matches if the query is a substring of `data-username` OR `data-question`.
- Toggles the `hidden` class accordingly.

`#search-hint` shows initially ("type to search posts"), `#no-results` shows when nothing matches.

> The search is currently rankings + posts mixed. If the user types nothing, all results are hidden. There is no autocomplete.

---

## 14. Admin page (`/admin`)

`admin.astro` + `admin.ts`. Hidden from the floating nav (the layout is rendered with `showNav={false}`). There is no link to `/admin` from the regular UI — the admin types the URL manually.

Lists unapproved polls (from `/api/polls/getUnapproved` — admin-only on the backend). Each card has `Approve` and `Delete` buttons. Calls `/api/polls/approvePoll` or `/api/polls/delete`, then refetches the list.

The "users" section has placeholder buttons; nothing is wired up.

> If the current user is not admin, `/api/polls/getUnapproved` returns 403 and the script shows `feed-error`. There is no route guard — the URL simply renders an unhelpful page.

---

## 15. The API config

`src/config/api.ts` is the single source of truth for backend URLs. **Every fetch in the codebase uses `API.<group>.<key>`** — never hardcode a URL.

Structure:
```ts
const BASE_URL = import.meta.env.PUBLIC_API_BASE_URL;
export const API = {
  auth: { login, register, logout, verify, status, devLogin },
  polls: {
    getAll, get, getUnapproved, getMyPolls,
    create, delete: ..., vote, comment, getAllComments,
    redditVote, redditScore,
    approvePoll, deleteVote,
    like,
  },
};
```

`api.test.ts` asserts that the BASE_URL resolves and that all keys the codebase uses are present. If you add an endpoint:
1. Add it to `API.polls` (or `API.auth`).
2. Update the `required` array in `api.test.ts` if other code relies on it.

---

## 16. Tests

Run all: `npm test`. Currently **9 tests** pass.

### 16.1 `src/utils/cookies.test.ts` (5 tests)

- `getCookie` returns undefined for missing cookie
- round-trip set/get
- multiple cookies are independent
- `deleteCookie` removes the value
- name prefix collision: `user` and `userId` don't shadow each other

The `beforeEach` clears every cookie in `document.cookie` to isolate tests, since `happy-dom` shares the document across the suite.

### 16.2 `src/config/api.test.ts` (4 tests)

- Base URL prefix matches `PUBLIC_API_BASE_URL`
- All `API.auth.*` URLs resolve to `${base}/api/auth/...`
- All `API.polls.*` URLs match the regex `/^${base}/api/polls/`
- A required-keys list is present (sanity guard against accidental renames)

### 16.3 The vitest config

```ts
test: {
  environment: "happy-dom",
  include: ["src/**/*.test.ts"],
  env: { PUBLIC_API_BASE_URL: "http://localhost:5001" },
}
```

`happy-dom` is the lightweight DOM substitute — provides `document`, `window`, `localStorage`, and friends. Faster than `jsdom`, sufficient for these tests. If a test needs more browser-true behaviour, you can swap to `jsdom` per-file via `// @vitest-environment jsdom`.

### 16.4 Adding a test

`src/<somewhere>/whatever.test.ts`. Vitest picks it up automatically. Use `import { describe, expect, it } from "vitest"`. The DOM is fresh per test file but **shared across `describe`/`it` within a file** — clear state in `beforeEach` if needed.

---

## 17. Styling conventions

### 17.1 No CSS framework

Plain CSS. Classes are kebab-case. Specificity is kept low — the tree is shallow, the selectors are short.

### 17.2 Custom properties in `variables.css`

That file is the **only** place colors/sizes/spacing should live. If you find yourself typing a hex in another CSS file, ask whether it should be a token instead.

### 17.3 `box-sizing: border-box` everywhere

Set on `*, *::before, *::after` in `global.css`. Same place: `font-family: var(--font)` (which is `monospace`).

### 17.4 `appearance: none` on buttons

Set globally. Without this, browsers (especially Safari) apply native button styling and ignore your `color`. Don't undo this.

### 17.5 Scoping

Astro components support scoped CSS via `<style>` tags. Currently only `Logo.astro` uses this. Page-level CSS lives in `src/styles/*.css` and is imported from the page's frontmatter (`import "../styles/start.css";`). Both patterns are fine.

### 17.6 Card animation

```css
@keyframes cardIn { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
.poll-card { animation: cardIn 0.3s ease backwards; }
```

`backwards` is important — it applies the `from` state during the delay before the animation starts, so cards don't pop in at full opacity before their delay fires.

The feed sets `animation-delay` per-card (`${i * 0.06}s`) only on initial render. Subsequent re-renders set `animation: none` to skip.

### 17.7 Bar transitions

`.poll-option-bar { transition: width 0.6s cubic-bezier(0.4, 0, 1, 1); }`. The render scripts use the standard double-`requestAnimationFrame` trick to ensure the transition catches:

```ts
bar.style.width = "0";
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    bar.style.width = `${pct}%`;
  });
});
```

If the transition doesn't fire, you probably did the second `style.width` assignment in the same frame as the first — that's why we use two RAFs.

---

## 18. Common gotchas

1. **`data-theme` collision** — never use `data-theme` as a custom attribute on any element other than `<html>`. The CSS selectors in `variables.css` will match it and break that element's styling. Use `data-theme-choice` (or any other name) for theme-related dataset attrs on buttons/elements.
2. **`.field[hidden]` rule** — needed alongside `.field { display: flex }` to keep the `hidden` attribute working. Add it whenever you give a hideable container `display: flex` or `display: grid`.
3. **The user clicks back from the detail page** — the script doesn't re-run because of bfcache. The feed handles this with `pageshow + e.persisted` and `visibilitychange`. New pages that need to refresh on comeback need the same listeners.
4. **Cookies with `path` mismatch** — `cookies.ts` always uses `path=/`. Don't introduce other paths or `getCookie` won't find them.
5. **`localStorage.theme === "dark"|"light"`** but never `"system"`. The chooser stores nothing for "system" and reads `null` as "system". If you add another option, mirror that pattern (don't store a dummy value).
6. **`PUBLIC_` prefix** — `import.meta.env.FOO` only works if the variable name starts with `PUBLIC_`. Astro will not expose other env vars to the client.
7. **The skip button needs the backend** — `skip.ts` POSTs to `/api/auth/dev-login`, which only works when the backend has `DEBUG=true`. With `DEBUG=false` it returns 404 and the user is bounced.
8. **`/api/polls/comment`** returns `created_by` as **username** (not UUID). This was changed deliberately so the frontend can prepend the new comment without a follow-up fetch. Don't add code that expects a UUID there.
9. **Bar transition not firing after a vote** — make sure you reset `bar.style.width = "0"` first, then schedule the target with two nested `requestAnimationFrame`s. One RAF is not enough.
10. **`sessionStorage["pendingPollUpdates"]`** can pile up if the feed never gets to read it (e.g. user closes the tab). It's bounded to one session, so worst case it's discarded. Don't store anything sensitive there — it's plain JSON in dev tools.

---

## 19. Where to make a change

| You want to…                                                | File(s) to touch                                                       |
|-------------------------------------------------------------|-------------------------------------------------------------------------|
| Add a new page                                              | `src/pages/<name>.astro`, optionally `src/scripts/<name>.ts`            |
| Add a backend endpoint to call                              | `src/config/api.ts`, then call `API.x.y` from a script                  |
| Add a nav icon                                              | New `components/icons/<Name>Icon.astro`, then add to `BaseLayout.astro` |
| Change colors / add a token                                 | `src/styles/variables.css` (all 4 blocks: `:root`, dark media, light, dark) |
| Change the auth gate                                        | The top-of-script `if (!userId) window.location.replace("/login")` lines |
| Wire the floating nav back to a previously hidden page      | Add a `<a href="/foo">` in `BaseLayout.astro`'s `<nav class="floating-nav">` |
| Style something only on the feed                            | `src/styles/start.css` (or `poll-card.css` if it's the card)            |
| Add an in-place patch for a new poll field                  | Update `Poll` type in `feed.ts` + `poll.ts`, add to render functions, optionally stage in `stagePendingUpdate` |
| Block a route for unauthenticated users                     | First two lines of the page's `.ts` script                              |
| Block a route for non-admins                                | Currently no client guard; the API just 403s. Add a `verifyAdmin()` if needed. |
| Add a new theme option                                      | `variables.css` add a `[data-theme="<name>"]` block + `currentTheme()` + `applyTheme()` + a button in `settings.astro` with `data-theme-choice="<name>"` |

---

## 20. Production build

```bash
cd Frontend
npm run build         # output goes to dist/
npm run preview       # serves dist/ on a local port for sanity checking
```

Astro's static output is plain HTML/CSS/JS. Drop `dist/` on any static host (Netlify, Vercel, Cloudflare Pages, S3, nginx). The only runtime requirement is that whatever serves it can serve `/index.html` for `/`, etc. — a standard static-site server suffices.

The backend URL is **baked in at build time** via `PUBLIC_API_BASE_URL`. To target staging or production, change `.env` before `npm run build` (or pass it inline: `PUBLIC_API_BASE_URL=https://api.ranq.dev npm run build`).
