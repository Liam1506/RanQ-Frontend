import { API } from "../config/api";
import { getCookie } from "../utils/cookies";

const userId = getCookie("userId");
if (!userId) {
  window.location.replace("/login");
}

type Kind = "ranking" | "post";

type Poll = {
  id: string;
  kind: Kind;
  question: string;
  body: string;
  created_by: string;
  creator_username: string | null;
  created_at: string | null;
  approved: boolean;
  voted_option_id: string | null;
  comment_count: number;
  like_count: number;
  user_has_liked: boolean;
  total_up_down_score: number;
  options: Array<{ id: string; option: string; votes: number }>;
};

let allPolls: Poll[] = [];
let showUnvoted = false;
let typeFilter: "all" | Kind = "all";
let initialRender = true;

const MAX_OPTIONS_IN_FEED = 5;
const POST_PREVIEW_CHARS = 240;

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function totalVotes(poll: Poll): number {
  return poll.options.reduce((s, o) => s + o.votes, 0);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Render the inner content (everything except the outer <a>) so we can swap
// it on an existing card without losing the element reference.
function rankingInner(poll: Poll): string {
  const total = totalVotes(poll);
  const ranked = [...poll.options].sort((a, b) => b.votes - a.votes);
  const visible = ranked.slice(0, MAX_OPTIONS_IN_FEED);
  const overflow = ranked.length - visible.length;

  const options = visible
    .map((opt) => {
      const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0;
      const isVoted = opt.id === poll.voted_option_id;
      return `
        <li class="poll-option${isVoted ? " poll-option--voted" : ""}" data-option-id="${opt.id}">
          <div class="poll-option-bar" style="width:${pct}%"></div>
          <span class="poll-option-label">${escapeHtml(opt.option)}</span>
          <span class="poll-option-pct poll-option-pct--feed">${pct}%</span>
        </li>`;
    })
    .join("");

  const overflowLine = overflow > 0
    ? `<li class="poll-option-overflow">+ ${overflow} more →</li>`
    : "";

  return `
    <div class="poll-card-header"><p class="poll-question">${escapeHtml(poll.question)}</p><span class="poll-meta-date">${poll.created_at ? formatDate(poll.created_at) : ""}</span></div>
    <ul class="poll-options">${options}${overflowLine}</ul>
    <div class="poll-card-footer"><span class="poll-meta">${[`▲ ${poll.total_up_down_score} ▼`, `${poll.comment_count} comment${poll.comment_count !== 1 ? "s" : ""}`, `${total} vote${total !== 1 ? "s" : ""}`].join(" · ")}</span><span class="poll-meta poll-meta-author">${poll.creator_username ? `@${poll.creator_username}` : ""}</span></div>`;
}

function postInner(poll: Poll): string {
  const truncated = poll.body.length > POST_PREVIEW_CHARS;
  const preview = truncated
    ? poll.body.slice(0, POST_PREVIEW_CHARS).trimEnd() + "…"
    : poll.body;
  return `
    <div class="poll-card-header"><p class="poll-question">${escapeHtml(poll.question)}</p><span class="poll-meta-date">${poll.created_at ? formatDate(poll.created_at) : ""}</span></div>
    <p class="poll-body">${escapeHtml(preview)}</p>
    <div class="poll-card-footer"><span class="poll-meta">${`${poll.like_count} like${poll.like_count !== 1 ? "s" : ""} · ${poll.comment_count} comment${poll.comment_count !== 1 ? "s" : ""}`}</span><span class="poll-meta poll-meta-author">${poll.creator_username ? `@${poll.creator_username}` : ""}</span></div>`;
}

function buildCard(poll: Poll): HTMLAnchorElement {
  const a = document.createElement("a");
  a.className = poll.kind === "post" ? "poll-card poll-card--post" : "poll-card";
  a.href = `/poll?id=${poll.id}`;
  a.dataset.pollId = poll.id;
  a.dataset.kind = poll.kind;
  a.innerHTML = poll.kind === "post" ? postInner(poll) : rankingInner(poll);
  a.addEventListener("click", () => {
    sessionStorage.setItem("feedScroll", String(window.scrollY));
  });
  return a;
}

// Patch an existing card to match the new poll state without re-creating it.
// For rankings: the bar widths transition smoothly from old to new.
function patchCard(card: HTMLAnchorElement, poll: Poll) {
  card.innerHTML = poll.kind === "post" ? postInner(poll) : rankingInner(poll);
  card.dataset.kind = poll.kind;
  // Re-trigger the bar transition: start at 0 in the next frame, then to target.
  if (poll.kind === "ranking") {
    const bars = card.querySelectorAll<HTMLElement>(".poll-option-bar");
    const targets = Array.from(bars).map((b) => b.style.width);
    bars.forEach((b) => (b.style.width = "0"));
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bars.forEach((b, i) => (b.style.width = targets[i]));
      });
    });
  }
}

function applyFilters() {
  const sort = (document.getElementById("filter-sort") as HTMLSelectElement).value;

  let polls = [...allPolls];

  if (typeFilter !== "all") {
    polls = polls.filter((p) => p.kind === typeFilter);
  }

  if (showUnvoted) {
    polls = polls.filter((p) => p.kind === "ranking" && p.voted_option_id === null);
  }

  if (sort === "oldest") {
    polls = polls.slice().reverse();
  } else if (sort === "popular") {
    polls = polls.slice().sort((a, b) => totalVotes(b) - totalVotes(a));
  } else if (sort === "discussed") {
    polls = polls.slice().sort((a, b) => b.comment_count - a.comment_count);
  }

  if (polls.length === 0) {
    feed.innerHTML = `<p class="feed-empty">nothing matches.</p>`;
    return;
  }

  // Build a map of existing cards so we can reuse them
  const existing = new Map<string, HTMLAnchorElement>();
  feed.querySelectorAll<HTMLAnchorElement>("a.poll-card").forEach((c) => {
    if (c.dataset.pollId) existing.set(c.dataset.pollId, c);
  });

  // Drop any feed-empty / feed-error / feed-loading messages
  feed.querySelectorAll(".feed-empty, .feed-error, .feed-loading").forEach((el) =>
    el.remove(),
  );

  polls.forEach((poll, i) => {
    let card = existing.get(poll.id);
    if (card) {
      patchCard(card, poll);
      existing.delete(poll.id);
    } else {
      card = buildCard(poll);
      // Only animate-in on the very first render; later refreshes shouldn't replay
      if (initialRender) card.style.animationDelay = `${i * 0.06}s`;
      else card.style.animation = "none";

      // Initial bar growth animation for first-rendered ranking cards
      if (poll.kind === "ranking" && initialRender) {
        const bars = card.querySelectorAll<HTMLElement>(".poll-option-bar");
        const targets = Array.from(bars).map((b) => b.style.width);
        bars.forEach((b) => (b.style.width = "0"));
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            bars.forEach((b, j) => (b.style.width = targets[j]));
          });
        });
      }
    }
    // Re-append to maintain sort order (DOM move, not destroy)
    feed.appendChild(card);
  });

  // Anything left in `existing` is a card that no longer matches the filters — remove it.
  existing.forEach((card) => card.remove());

  initialRender = false;
}

// Apply pending optimistic updates left by the detail page so we stay in sync
// even before the silent refetch completes on bfcache restore.
function applyPendingUpdates() {
  const raw = sessionStorage.getItem("pendingPollUpdates");
  if (!raw) return;
  sessionStorage.removeItem("pendingPollUpdates");
  try {
    const updates: Record<string, Partial<Poll>> = JSON.parse(raw);
    Object.entries(updates).forEach(([id, patch]) => {
      const idx = allPolls.findIndex((p) => p.id === id);
      if (idx === -1) return;
      allPolls[idx] = { ...allPolls[idx], ...patch };
    });
  } catch {
    /* ignore malformed updates */
  }
}

async function fetchPolls(): Promise<Poll[] | null> {
  const res = await fetch(API.polls.getAll, {
    headers: { Authorization: `Bearer ${userId}` },
  });
  if (!res.ok) return null;
  return (await res.json()).filter((p: Poll) => p.approved);
}

async function loadFeed() {
  const polls = await fetchPolls();
  const feed = document.getElementById("feed")!;
  if (polls === null) {
    feed.innerHTML = `<p class="feed-error">failed to load.</p>`;
    return;
  }

  allPolls = polls;
  applyPendingUpdates();
  if (allPolls.length === 0) {
    feed.innerHTML = `<p class="feed-empty">nothing yet.</p>`;
  } else {
    applyFilters();
  }

  const savedScroll = sessionStorage.getItem("feedScroll");
  if (savedScroll) {
    sessionStorage.removeItem("feedScroll");
    requestAnimationFrame(() => window.scrollTo(0, parseInt(savedScroll)));
  }

  document.querySelectorAll<HTMLSelectElement>(".filter-sort").forEach((sel) => {
    sel.addEventListener("change", (e) => {
      const val = (e.target as HTMLSelectElement).value;
      document.querySelectorAll<HTMLSelectElement>(".filter-sort").forEach((s) => (s.value = val));
      applyFilters();
    });
  });

  const unvotedBtn = document.getElementById("filter-unvoted") as HTMLButtonElement;
  unvotedBtn?.addEventListener("click", () => {
    showUnvoted = !showUnvoted;
    unvotedBtn.classList.toggle("active", showUnvoted);
    applyFilters();
  });

  document.querySelectorAll<HTMLButtonElement>(".type-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      typeFilter = (tab.dataset.type as "all" | Kind) ?? "all";
      document
        .querySelectorAll<HTMLButtonElement>(".type-tab")
        .forEach((t) => t.classList.toggle("active", t === tab));
      // 'not voted' only makes sense for rankings — hide it on thoughts and
      // turn it off so the filter state doesn't linger when switching back.
      if (typeFilter === "post") {
        unvotedBtn.hidden = true;
        if (showUnvoted) {
          showUnvoted = false;
          unvotedBtn.classList.remove("active");
        }
      } else {
        unvotedBtn.hidden = false;
      }
      applyFilters();
    });
  });
}

// Silent refresh: refetch, merge, patch the DOM in place.
async function refreshFeed() {
  applyPendingUpdates(); // patch local state first for instant feedback
  applyFilters();

  const polls = await fetchPolls();
  if (polls === null) return;
  allPolls = polls;
  applyPendingUpdates(); // re-apply pendings in case server lags
  applyFilters();
}

// Fires when the page becomes visible again — including bfcache restores
// (browser back button) which DON'T re-run the script otherwise.
window.addEventListener("pageshow", (e) => {
  if (e.persisted) {
    // bfcache restore — script state is intact, just refresh
    refreshFeed();
  }
});

// Also refresh when the tab is brought back into focus
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && allPolls.length > 0) {
    refreshFeed();
  }
});

loadFeed();
