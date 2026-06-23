import { API } from "../config/api";
import { getCookie } from "../utils/cookies";

const userId = getCookie("userId");
if (!userId) {
  window.location.replace("/login");
}

type Kind = "ranking" | "post" | "quote";

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

type FeedResponse = {
  polls: Poll[];
  next_cursor: string | null;
  has_more: boolean;
};

let allPolls: Poll[] = [];
let nextCursor: string | null = null;
let hasMore = false;
let isLoading = false;
let showUnvoted = false;
let typeFilter: "all" | Kind = "all";
let sort = "newest";
let initialRender = true;

const LIMIT = 10;
const MAX_OPTIONS_IN_FEED = 5;
const POST_PREVIEW_CHARS = 240;

const feed = document.getElementById("feed")!;
const newPostsBanner = document.getElementById("new-posts-banner") as HTMLButtonElement;
const unvotedBtn = document.getElementById("filter-unvoted") as HTMLButtonElement;

// Sentinel element at the bottom of the feed for IntersectionObserver
const sentinel = document.createElement("div");
sentinel.id = "feed-sentinel";
feed.after(sentinel);

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
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

function rankingInner(poll: Poll): string {
  const total = totalVotes(poll);
  const ranked = [...poll.options].sort((a, b) => b.votes - a.votes);
  const visible = ranked.slice(0, MAX_OPTIONS_IN_FEED);
  const overflow = ranked.length - visible.length;

  const options = visible.map((opt) => {
    const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0;
    const isVoted = opt.id === poll.voted_option_id;
    return `
      <li class="poll-option${isVoted ? " poll-option--voted" : ""}" data-option-id="${opt.id}">
        <div class="poll-option-bar" style="width:${pct}%"></div>
        <span class="poll-option-label">${escapeHtml(opt.option)}</span>
        <span class="poll-option-pct poll-option-pct--feed">${pct}%</span>
      </li>`;
  }).join("");

  const overflowLine = overflow > 0 ? `<li class="poll-option-overflow">+ ${overflow} more →</li>` : "";

  return `
    <div class="poll-card-header"><p class="poll-question">${escapeHtml(poll.question)}</p><span class="poll-meta-date">${poll.created_at ? formatDate(poll.created_at) : ""}</span></div>
    <ul class="poll-options">${options}${overflowLine}</ul>
    <div class="poll-card-footer"><span class="poll-meta">${[`▲ ${poll.total_up_down_score} ▼`, `${poll.comment_count} comment${poll.comment_count !== 1 ? "s" : ""}`, `${totalVotes(poll)} vote${totalVotes(poll) !== 1 ? "s" : ""}`].join(" · ")}</span><span class="poll-meta poll-meta-author">${poll.creator_username ? `@${poll.creator_username}` : ""}</span></div>`;
}

function postInner(poll: Poll): string {
  const truncated = poll.body.length > POST_PREVIEW_CHARS;
  const preview = truncated ? poll.body.slice(0, POST_PREVIEW_CHARS).trimEnd() + "…" : poll.body;
  return `
    <div class="poll-card-header"><p class="poll-question">${escapeHtml(poll.question)}</p><span class="poll-meta-date">${poll.created_at ? formatDate(poll.created_at) : ""}</span></div>
    <p class="poll-body">${escapeHtml(preview)}</p>
    <div class="poll-card-footer"><span class="poll-meta">${poll.like_count} like${poll.like_count !== 1 ? "s" : ""} · ${poll.comment_count} comment${poll.comment_count !== 1 ? "s" : ""}</span><span class="poll-meta poll-meta-author">${poll.creator_username ? `@${poll.creator_username}` : ""}</span></div>`;
}

function quoteInner(poll: Poll): string {
  return `
    <div class="poll-card-header"><p class="poll-question">${escapeHtml(poll.question)}</p><span class="poll-meta-date">${poll.created_at ? formatDate(poll.created_at) : ""}</span></div>
    <p class="poll-body poll-body--quote">${escapeHtml(poll.body)}</p>
    <div class="poll-card-footer"><span class="poll-meta">${poll.like_count} like${poll.like_count !== 1 ? "s" : ""} · ${poll.comment_count} comment${poll.comment_count !== 1 ? "s" : ""}</span><span class="poll-meta poll-meta-author">${poll.creator_username ? `@${poll.creator_username}` : ""}</span></div>`;
}

function innerHtml(poll: Poll): string {
  if (poll.kind === "post") return postInner(poll);
  if (poll.kind === "quote") return quoteInner(poll);
  return rankingInner(poll);
}

function buildCard(poll: Poll, index: number): HTMLAnchorElement {
  const a = document.createElement("a");
  a.className = poll.kind === "post" ? "poll-card poll-card--post" : poll.kind === "quote" ? "poll-card poll-card--quote" : "poll-card";
  a.href = `/poll?id=${poll.id}`;
  a.dataset.pollId = poll.id;
  a.dataset.kind = poll.kind;
  a.innerHTML = innerHtml(poll);
  if (initialRender) a.style.animationDelay = `${index * 0.06}s`;
  else a.style.animation = "none";
  if (poll.kind === "ranking" && initialRender) animateBars(a);
  a.addEventListener("click", () => sessionStorage.setItem("feedScroll", String(window.scrollY)));
  return a;
}

function popElement(el: Element | null) {
  if (!el) return;
  el.classList.remove("count-pop");
  // Force reflow so re-adding the class re-triggers the animation
  void (el as HTMLElement).offsetWidth;
  el.classList.add("count-pop");
  el.addEventListener("animationend", () => el.classList.remove("count-pop"), { once: true });
}

function patchCard(card: HTMLAnchorElement, oldPoll: Poll, newPoll: Poll) {
  // Capture old bar widths before re-rendering so we can animate from them
  const oldBars = new Map<string, string>();
  card.querySelectorAll<HTMLElement>(".poll-option[data-option-id]").forEach((li) => {
    const bar = li.querySelector<HTMLElement>(".poll-option-bar");
    if (bar) oldBars.set(li.dataset.optionId!, bar.style.width);
  });

  card.innerHTML = innerHtml(newPoll);
  card.dataset.kind = newPoll.kind;

  // Animate bars from old width to new width
  if (newPoll.kind === "ranking") {
    card.querySelectorAll<HTMLElement>(".poll-option[data-option-id]").forEach((li) => {
      const bar = li.querySelector<HTMLElement>(".poll-option-bar");
      if (!bar) return;
      const target = bar.style.width;
      const from = oldBars.get(li.dataset.optionId!) ?? "0%";
      if (from !== target) {
        bar.style.width = from;
        requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.width = target; }));
      }
    });
  }

  // Pop counts that changed
  if (newPoll.like_count !== oldPoll.like_count) {
    popElement(card.querySelector(".like-count"));
  }
  if (newPoll.comment_count !== oldPoll.comment_count) {
    popElement(card.querySelector(".poll-meta"));
  }
  const oldTotal = totalVotes(oldPoll);
  const newTotal = totalVotes(newPoll);
  if (newTotal !== oldTotal) {
    card.querySelectorAll(".poll-option-pct, .poll-option-count").forEach(popElement);
  }
}

function animateBars(card: HTMLAnchorElement) {
  const bars = card.querySelectorAll<HTMLElement>(".poll-option-bar");
  const targets = Array.from(bars).map((b) => b.style.width);
  bars.forEach((b) => (b.style.width = "0"));
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      bars.forEach((b, i) => (b.style.width = targets[i]));
    });
  });
}

function renderAll() {
  const polls = [...allPolls];

  feed.querySelectorAll(".feed-empty, .feed-error, .feed-loading").forEach((el) => el.remove());

  if (polls.length === 0 && !hasMore) {
    feed.innerHTML = `<p class="feed-empty">nothing here yet.</p>`;
    return;
  }

  const existing = new Map<string, HTMLAnchorElement>();
  feed.querySelectorAll<HTMLAnchorElement>("a.poll-card").forEach((c) => {
    if (c.dataset.pollId) existing.set(c.dataset.pollId, c);
  });

  polls.forEach((poll, i) => {
    const card = existing.get(poll.id);
    if (card) {
      const oldPoll = allPolls.find((p) => p.id === poll.id) ?? poll;
      patchCard(card, oldPoll, poll);
      existing.delete(poll.id);
    } else {
      feed.appendChild(buildCard(poll, i));
    }
  });

  existing.forEach((card) => card.remove());
  initialRender = false;
}

async function fetchPage(cursor: string | null = null): Promise<FeedResponse | null> {
  const params = new URLSearchParams({ limit: String(LIMIT), sort });
  if (typeFilter !== "all") params.set("kind", typeFilter);
  if (showUnvoted) params.set("not_voted", "true");
  if (cursor) params.set("cursor", cursor);

  const res = await fetch(`${API.polls.feed}?${params}`, {
    headers: { Authorization: `Bearer ${userId}` },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    feed.innerHTML = `<p class="feed-error">${body?.detail ?? "failed to load."}</p>`;
    return null;
  }
  return res.json();
}

async function loadFeed() {
  feed.innerHTML = `<p class="feed-loading">loading...</p>`;
  allPolls = [];
  nextCursor = null;
  hasMore = false;
  initialRender = true;

  const data = await fetchPage();
  if (!data) return;

  allPolls = data.polls;
  nextCursor = data.next_cursor;
  hasMore = data.has_more;

  applyPendingUpdates();
  renderAll();

  const savedScroll = sessionStorage.getItem("feedScroll");
  if (savedScroll) {
    sessionStorage.removeItem("feedScroll");
    requestAnimationFrame(() => window.scrollTo(0, parseInt(savedScroll)));
  }
}

async function loadMore() {
  if (!hasMore || isLoading || !nextCursor) return;
  isLoading = true;

  const data = await fetchPage(nextCursor);
  if (!data) { isLoading = false; return; }

  allPolls = [...allPolls, ...data.polls];
  nextCursor = data.next_cursor;
  hasMore = data.has_more;

  renderAll();
  isLoading = false;
}

async function refreshFeed() {
  applyPendingUpdates();
  renderAll();

  const data = await fetchPage();
  if (!data) return;

  // Merge: keep existing polls, prepend any new ones, update existing ones
  const existingIds = new Set(allPolls.map((p) => p.id));
  const newPolls = data.polls.filter((p) => !existingIds.has(p.id));
  const updated = allPolls.map((p) => data.polls.find((q) => q.id === p.id) ?? p);
  allPolls = [...newPolls, ...updated];

  applyPendingUpdates();
  renderAll();
}

function applyPendingUpdates() {
  const raw = sessionStorage.getItem("pendingPollUpdates");
  if (!raw) return;
  sessionStorage.removeItem("pendingPollUpdates");
  try {
    const updates: Record<string, Partial<Poll>> = JSON.parse(raw);
    Object.entries(updates).forEach(([id, patch]) => {
      const idx = allPolls.findIndex((p) => p.id === id);
      if (idx !== -1) allPolls[idx] = { ...allPolls[idx], ...patch };
    });
  } catch { /* ignore */ }
}

// IntersectionObserver — fires loadMore when sentinel scrolls into view
const observer = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting) loadMore();
}, { rootMargin: "200px" });
observer.observe(sentinel);

// Filter/sort listeners
document.querySelectorAll<HTMLSelectElement>(".filter-sort").forEach((sel) => {
  sel.addEventListener("change", (e) => {
    sort = (e.target as HTMLSelectElement).value;
    document.querySelectorAll<HTMLSelectElement>(".filter-sort").forEach((s) => {
      s.value = sort;
    });
    if (sort !== "newest") newPostsBanner.hidden = true;
    loadFeed();
  });
});

unvotedBtn?.addEventListener("click", () => {
  showUnvoted = !showUnvoted;
  unvotedBtn.classList.toggle("active", showUnvoted);
  loadFeed();
});

document.querySelectorAll<HTMLButtonElement>(".type-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    typeFilter = (tab.dataset.type as "all" | Kind) ?? "all";
    document.querySelectorAll<HTMLButtonElement>(".type-tab").forEach((t) => t.classList.toggle("active", t === tab));
    if (typeFilter === "post" || typeFilter === "quote") {
      unvotedBtn.hidden = true;
      if (showUnvoted) { showUnvoted = false; unvotedBtn.classList.remove("active"); }
    } else {
      unvotedBtn.hidden = false;
    }
    // Re-fetch from scratch with the new kind filter
    loadFeed();
  });
});

// bfcache restore and visibility change
window.addEventListener("pageshow", (e) => { if (e.persisted) refreshFeed(); });
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && allPolls.length > 0) refreshFeed();
});

// New posts banner
newPostsBanner.addEventListener("click", () => {
  newPostsBanner.hidden = true;
  loadFeed();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

async function checkForNewPosts() {
  if (allPolls.length === 0) return;

  // Banner only makes sense on newest sort — other sorts aren't ordered by creation time
  if (sort === "newest") {
    const params = new URLSearchParams({ limit: "1" });
    if (typeFilter !== "all") params.set("kind", typeFilter);
    const res = await fetch(`${API.polls.feed}?${params}`, {
      headers: { Authorization: `Bearer ${userId}` },
    });
    if (res.ok) {
      const data: FeedResponse = await res.json();
      const latestFetched = data.polls[0]?.created_at;
      const latestKnown = allPolls[0]?.created_at;
      if (latestFetched && latestKnown && latestFetched > latestKnown) {
        newPostsBanner.hidden = false;
      }
    }
  }

  // Silently refresh vote/like/comment counts for all loaded polls
  const ids = allPolls.map((p) => p.id);
  const statsRes = await fetch(API.polls.bulkStats, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${userId}` },
    body: JSON.stringify({ ids }),
  });
  if (!statsRes.ok) return;
  const updated: Poll[] = await statsRes.json();
  const byId = new Map(updated.map((p) => [p.id, p]));
  allPolls = allPolls.map((p) => byId.get(p.id) ?? p);
  renderAll();
}

const ticker = setInterval(() => {
  if (document.visibilityState === "visible") checkForNewPosts();
}, 30_000);
window.addEventListener("pagehide", () => clearInterval(ticker));

loadFeed();
