import { API } from "../config/api";
import { getCookie } from "../utils/cookies";

const userId = getCookie("userId");
if (!userId) window.location.replace("/login");

const input = document.getElementById("search-input") as HTMLInputElement;
const noResults = document.getElementById("no-results") as HTMLParagraphElement;
const postList = document.getElementById("post-list") as HTMLElement;

const POST_PREVIEW_CHARS = 200;
const MAX_OPTIONS_IN_FEED = 3;

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

  const optionsText = (post.options ?? []).map((o: any) => o.option).join(" ");

  const cardClass = post.kind === "post" ? "poll-card poll-card--post" : post.kind === "quote" ? "poll-card poll-card--quote" : "poll-card";

  return `<div class="post-wrapper" data-question="${escapeHtml(post.question ?? "")}" data-username="${escapeHtml(username)}" data-body="${escapeHtml(post.body ?? "")}" data-options="${escapeHtml(optionsText)}">
    <a class="${cardClass}" href="/poll?id=${post.id}">
      ${header}${middle}${footer}
    </a>
  </div>`;
}

const response = await fetch(API.polls.getAll, {
  headers: { Authorization: `Bearer ${userId}` },
});

if (!response.ok) {
  const body = await response.json().catch(() => null);
  postList.innerHTML = `<p class="feed-error">${body?.detail ?? "failed to load posts."}</p>`;
} else {
  const posts = await response.json();
  postList.innerHTML = posts.map(renderCard).join("");
}

const postWrapper = postList.querySelectorAll<HTMLElement>(".post-wrapper");

input.addEventListener("input", () => {
  const raw = input.value.trim().toLowerCase();
  const query = raw.startsWith("@") ? raw.slice(1) : raw;

  if (query === "") {
    postWrapper.forEach((w) => w.classList.remove("hidden"));
    noResults.classList.add("hidden");
    return;
  }

  let foundAny = false;

  postWrapper.forEach((wrapper) => {
    const username = (wrapper.dataset.username ?? "").toLowerCase();
    const question = (wrapper.dataset.question ?? "").toLowerCase();
    const body = (wrapper.dataset.body ?? "").toLowerCase();
    const options = (wrapper.dataset.options ?? "").toLowerCase();
    const matches = username.includes(query) || question.includes(query) || body.includes(query) || options.includes(query);
    wrapper.classList.toggle("hidden", !matches);
    if (matches) foundAny = true;
  });

  noResults.classList.toggle("hidden", foundAny);
});
