import { API } from "../config/api";
import { getCookie } from "../utils/cookies";

const userId = getCookie("userId");
if (!userId) window.location.replace("/login");

const input = document.getElementById("search-input") as HTMLInputElement;
const noResults = document.getElementById("no-results") as HTMLParagraphElement;
const postList = document.getElementById("post-list") as HTMLElement;
const sentinel = document.getElementById("search-sentinel") as HTMLDivElement;

const POST_PREVIEW_CHARS = 200;
const MAX_OPTIONS_IN_FEED = 3;
const LIMIT = 10;
const DEBOUNCE_MS = 300;

let currentQuery = "";
let offset = 0;
let hasMore = false;
let isLoading = false;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function renderCard(post: any): string {
  const username = post.creator_username ?? "";
  const date = formatDate(post.created_at);
  const author = username ? `@${escapeHtml(username)}` : "";

  const header = `<div class="poll-card-header">
    <p class="poll-question">${escapeHtml(post.question)}</p>
    <span class="poll-meta-date">${date}</span>
  </div>`;

  let middle = "";
  if (post.kind === "post" || post.kind === "quote") {
    const truncated = post.body?.length > POST_PREVIEW_CHARS;
    const preview = truncated ? post.body.slice(0, POST_PREVIEW_CHARS).trimEnd() + "…" : (post.body ?? "");
    const cls = post.kind === "quote" ? "poll-body poll-body--quote" : "poll-body";
    middle = `<p class="${cls}">${escapeHtml(preview)}</p>`;
  } else {
    const total = post.options.reduce((s: number, o: any) => s + o.votes, 0);
    const visible = [...post.options].sort((a: any, b: any) => b.votes - a.votes).slice(0, MAX_OPTIONS_IN_FEED);
    const overflow = post.options.length - visible.length;
    const options = visible.map((opt: any) => {
      const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0;
      const isVoted = opt.id === post.voted_option_id;
      return `<li class="poll-option poll-option--ranked${isVoted ? " poll-option--voted" : ""}">
        <div class="poll-option-bar" style="width:${pct}%"></div>
        <span class="poll-option-label">${escapeHtml(opt.option)}</span>
        <span class="poll-option-pct">${pct}%</span>
      </li>`;
    }).join("");
    const overflowLine = overflow > 0 ? `<li class="poll-option-overflow">+ ${overflow} more →</li>` : "";
    middle = `<ul class="poll-options">${options}${overflowLine}</ul>`;
  }

  const total = post.options.reduce((s: number, o: any) => s + o.votes, 0);
  const left = post.kind === "post" || post.kind === "quote"
    ? `${post.like_count ?? 0} like${post.like_count !== 1 ? "s" : ""} · ${post.comment_count ?? 0} comment${post.comment_count !== 1 ? "s" : ""}`
    : `▲ ${post.total_up_down_score ?? 0} ▼ · ${post.comment_count ?? 0} comment${post.comment_count !== 1 ? "s" : ""} · ${total} vote${total !== 1 ? "s" : ""}`;

  const footer = `<div class="poll-card-footer">
    <span class="poll-meta">${left}</span>
    <span class="poll-meta poll-meta-author">${author}</span>
  </div>`;

  const cardClass = post.kind === "post" ? "poll-card poll-card--post" : post.kind === "quote" ? "poll-card poll-card--quote" : "poll-card";

  return `<a class="${cardClass}" href="/poll?id=${post.id}">${header}${middle}${footer}</a>`;
}

async function fetchResults(q: string, off: number): Promise<{ polls: any[]; has_more: boolean } | null> {
  const params = new URLSearchParams({ q, limit: String(LIMIT), offset: String(off) });
  const res = await fetch(`${API.polls.search}?${params}`, {
    headers: { Authorization: `Bearer ${userId}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    postList.innerHTML = `<p class="feed-error">${body?.detail ?? "failed to load."}</p>`;
    return null;
  }
  return res.json();
}

async function search(q: string) {
  currentQuery = q;
  offset = 0;
  hasMore = false;
  noResults.classList.add("hidden");

  postList.innerHTML = `<p class="feed-loading">searching...</p>`;

  const data = await fetchResults(q, 0);
  if (!data || currentQuery !== q) return;

  postList.innerHTML = "";

  if (data.polls.length === 0) {
    noResults.classList.remove("hidden");
    return;
  }

  postList.innerHTML = data.polls.map(renderCard).join("");
  offset = data.polls.length;
  hasMore = data.has_more;
}

async function loadMore() {
  if (!hasMore || isLoading || !currentQuery) return;
  isLoading = true;

  const data = await fetchResults(currentQuery, offset);
  if (!data) { isLoading = false; return; }

  postList.insertAdjacentHTML("beforeend", data.polls.map(renderCard).join(""));
  offset += data.polls.length;
  hasMore = data.has_more;
  isLoading = false;
}

// Debounced input handler
let debounceTimer: ReturnType<typeof setTimeout>;
input.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  const q = input.value.trim();
  debounceTimer = setTimeout(() => search(q), DEBOUNCE_MS);
});

// IntersectionObserver for auto load more
const observer = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting) loadMore();
}, { rootMargin: "200px" });
observer.observe(sentinel);

// Load default feed on page load
search("");
