### 🔗 [Backend Repository & Issues](https://github.com/HaiTzung/RanQ/issues)

# ranq

A web-based polling platform for the DHBW community. Users can create polls, vote, search, and browse a feed of community polls. Admins can approve submitted polls before they go live.

**Live site:** https://ranq.dev

## Tech stack

- [Astro 6](https://astro.build) — static site generation with server-side rendering
- Vanilla TypeScript — all client-side interactivity, no JS framework
- Node.js >=22.12.0

## Getting started

```bash
npm install
```

Create a `.env` file at the root:

```
PUBLIC_API_BASE_URL=http://localhost:5001
```

```bash
npm run dev      # http://localhost:4321
npm run build    # production build
npm run preview  # preview production build locally
```

## Features

- Create polls with multiple options
- Vote on polls (one vote per user)
- Feed with sorting (newest, oldest, most votes) and vote-filter
- Search polls by question or creator
- Email verification on registration
- Dark / light theme toggle
- Admin panel for poll approval
...
