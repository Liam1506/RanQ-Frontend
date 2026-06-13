import { API } from "../config/api";
import { getCookie } from "../utils/cookies";

const userId = getCookie("userId");
if (!userId) window.location.replace("/login");

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
  options: Array<{ id: string; option: string; votes: number }>;
};

let allPolls: Poll[] = [];
let showUnapprovedOnly = false;
let typeFilter: "all" | Kind = "all";

const POST_PREVIEW_CHARS = 200;

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
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ---- account section ----

async function loadUserInfo() {
  const usernameEl = document.getElementById("info-username") as HTMLElement;
  const emailEl = document.getElementById("info-email") as HTMLElement;
  try {
    const res = await fetch(`${API.auth.status}?userId=${userId}`);
    if (!res.ok) return;
    const data = await res.json();
    usernameEl.textContent = data.username ? `@${data.username}` : "—";
    emailEl.textContent = data.email ?? "—";
  } catch {
    /* leave placeholders */
  }
}

// ---- appearance section ----

function currentTheme(): "light" | "dark" | "system" {
  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") return saved;
  return "system";
}

function applyTheme(theme: "light" | "dark" | "system") {
  if (theme === "system") {
    localStorage.removeItem("theme");
    document.documentElement.removeAttribute("data-theme");
  } else {
    localStorage.setItem("theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }
  syncThemeButtons();
}

function syncThemeButtons() {
  const active = currentTheme();
  document
    .querySelectorAll<HTMLButtonElement>(".theme-option")
    .forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.themeChoice === active);
    });
}

document.querySelectorAll<HTMLButtonElement>(".theme-option").forEach((btn) => {
  btn.addEventListener("click", () => {
    const t = btn.dataset.themeChoice as "light" | "dark" | "system";
    applyTheme(t);
  });
});
syncThemeButtons();

// ---- my posts section ----

function renderRankingCard(poll: Poll): string {
  const total = poll.options.reduce((s, o) => s + o.votes, 0);
  const optionsHtml = poll.options
    .map((opt) => {
      const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0;
      return `
        <li class="poll-option">
          <div class="poll-option-bar" style="width:0%"></div>
          <span class="poll-option-label">${escapeHtml(opt.option)}</span>
          <span class="poll-option-pct">${pct}%</span>
        </li>`;
    })
    .join("");

  const meta = [
    `${total} vote${total !== 1 ? "s" : ""}`,
    poll.created_at ? formatDate(poll.created_at) : "",
    poll.approved ? "" : "unapproved",
  ]
    .filter(Boolean)
    .join(" · ");

  return `
    <a class="poll-card" style="cursor:default">
      <p class="poll-question">${escapeHtml(poll.question)}</p>
      <ul class="poll-options">${optionsHtml}</ul>
      <span class="poll-meta">${meta}</span>
      <div class="poll-card-actions">
        <button class="delete-btn" data-poll-id="${poll.id}">delete</button>
      </div>
    </a>`;
}

function renderPostCard(poll: Poll): string {
  const truncated = poll.body.length > POST_PREVIEW_CHARS;
  const preview = truncated
    ? poll.body.slice(0, POST_PREVIEW_CHARS).trimEnd() + "…"
    : poll.body;

  const meta = [
    `${poll.like_count} like${poll.like_count !== 1 ? "s" : ""}`,
    `${poll.comment_count} comment${poll.comment_count !== 1 ? "s" : ""}`,
    poll.created_at ? formatDate(poll.created_at) : "",
    poll.approved ? "" : "unapproved",
  ]
    .filter(Boolean)
    .join(" · ");

  return `
    <a class="poll-card poll-card--post" style="cursor:default">
      <p class="poll-question">${escapeHtml(poll.question)}</p>
      <p class="poll-body">${escapeHtml(preview)}</p>
      <span class="poll-meta">${meta}</span>
      <div class="poll-card-actions">
        <button class="delete-btn" data-poll-id="${poll.id}">delete</button>
      </div>
    </a>`;
}

function renderPolls() {
  const feed = document.getElementById("settings-box-polls")!;

  let polls = [...allPolls];
  if (typeFilter !== "all") polls = polls.filter((p) => p.kind === typeFilter);
  if (showUnapprovedOnly) polls = polls.filter((p) => !p.approved);

  if (polls.length === 0) {
    feed.innerHTML = `<p class="feed-empty">nothing here.</p>`;
    return;
  }

  feed.innerHTML = "";

  polls.forEach((poll, i) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = poll.kind === "post" ? renderPostCard(poll) : renderRankingCard(poll);
    const card = tmp.firstElementChild as HTMLElement;
    card.style.animationDelay = `${i * 0.06}s`;

    const total = poll.options.reduce((s, o) => s + o.votes, 0);
    const bars = card.querySelectorAll<HTMLElement>(".poll-option-bar");
    const targets = poll.options.map((opt) =>
      total > 0 ? `${Math.round((opt.votes / total) * 100)}%` : "0%",
    );

    feed.appendChild(card);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bars.forEach((b, j) => (b.style.width = targets[j]));
      });
    });

    card
      .querySelector<HTMLButtonElement>(".delete-btn")!
      .addEventListener("click", (e) => {
        e.stopPropagation();
        deletePoll(poll.id);
      });
  });
}

async function deletePoll(poll_id: string) {
  const res = await fetch(API.polls.delete, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userId}`,
    },
    body: JSON.stringify({ id: poll_id }),
  });
  if (!res.ok) {
    console.error("failed to delete poll");
    return;
  }
  allPolls = allPolls.filter((p) => p.id !== poll_id);
  renderPolls();
}

async function loadPolls() {
  const res = await fetch(API.polls.getMyPolls, {
    headers: { Authorization: `Bearer ${userId}` },
  });
  const feed = document.getElementById("settings-box-polls")!;
  if (!res.ok) {
    feed.innerHTML = `<p class="feed-error">failed to load polls.</p>`;
    return;
  }
  allPolls = await res.json();
  renderPolls();
}

const unapprovedBtn = document.getElementById(
  "filter-unapproved",
) as HTMLButtonElement;
unapprovedBtn?.addEventListener("click", () => {
  showUnapprovedOnly = !showUnapprovedOnly;
  unapprovedBtn.classList.toggle("active", showUnapprovedOnly);
  renderPolls();
});

document.querySelectorAll<HTMLButtonElement>(".type-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    typeFilter = (tab.dataset.type as "all" | Kind) ?? "all";
    document
      .querySelectorAll<HTMLButtonElement>(".type-tab")
      .forEach((t) => t.classList.toggle("active", t === tab));
    renderPolls();
  });
});

loadUserInfo();
loadPolls();
