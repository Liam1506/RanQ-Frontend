import { API } from "../config/api";
import { getCookie } from "../utils/cookies";

const userId = getCookie("userId");
if (!userId) window.location.replace("/login");

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

let allPolls: Poll[] = [];
let nextCursor: string | null = null;
let hasMore = false;
let isLoadingPolls = false;
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

async function checkMaintenance() {
  const res = await fetch(API.siteSettings.get, {
    headers: { Authorization: `Bearer ${userId}` },
  });
  if (!res.ok) return;
  const data = await res.json();
  if (data.maintenance_mode) {
    const ids = ["input-new-handle", "btn-change-username", "input-current-password", "input-new-password", "btn-change-password", "input-delete-confirm", "btn-delete-account"];
    ids.forEach((id) => {
      const el = document.getElementById(id) as HTMLInputElement | HTMLButtonElement | null;
      if (el) el.disabled = true;
    });
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
    <div class="poll-card poll-card--static" data-poll-id="${poll.id}">
      <p class="poll-question">${escapeHtml(poll.question)}</p>
      <ul class="poll-options">${optionsHtml}</ul>
      <span class="poll-meta">${meta}</span>
      <div class="poll-card-actions">
        <button class="delete-btn btn-secondary btn--danger">delete</button>
      </div>
    </div>`;
}

function renderPostCard(poll: Poll): string {
  const truncated = poll.body.length > POST_PREVIEW_CHARS;
  const preview = truncated
    ? poll.body.slice(0, POST_PREVIEW_CHARS).trimEnd() + "…"
    : poll.body;

  const meta = [
    `▲ ${poll.total_up_down_score} ▼`,
    `${poll.comment_count} comment${poll.comment_count !== 1 ? "s" : ""}`,
    poll.created_at ? formatDate(poll.created_at) : "",
    poll.approved ? "" : "unapproved",
  ]
    .filter(Boolean)
    .join(" · ");

  return `
    <div class="poll-card poll-card--post poll-card--static" data-poll-id="${poll.id}">
      <p class="poll-question">${escapeHtml(poll.question)}</p>
      <p class="poll-body">${escapeHtml(preview)}</p>
      <span class="poll-meta">${meta}</span>
      <div class="poll-card-actions">
        <button class="delete-btn btn-secondary btn--danger">delete</button>
      </div>
    </div>`;
}

function renderPolls() {
  const feed = document.getElementById("settings-box-polls")!;

  const polls = [...allPolls];

  feed.querySelectorAll(".feed-empty, .feed-error, .feed-loading").forEach((el) => el.remove());

  if (polls.length === 0 && !hasMore) {
    feed.innerHTML = `<p class="feed-empty">nothing here.</p>`;
    return;
  }

  const existingIds = new Set(
    Array.from(feed.querySelectorAll<HTMLElement>("[data-poll-id]")).map((el) => el.dataset.pollId)
  );

  polls.forEach((poll, i) => {
    if (existingIds.has(poll.id)) return;
    const tmp = document.createElement("div");
    tmp.innerHTML = poll.kind === "post" || poll.kind === "quote"
      ? renderPostCard(poll)
      : renderRankingCard(poll);
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

    card.querySelector<HTMLButtonElement>(".delete-btn")!.addEventListener("click", (e) => {
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
  if (!res.ok) return;
  allPolls = allPolls.filter((p) => p.id !== poll_id);
  const card = document.querySelector<HTMLElement>(`[data-poll-id="${poll_id}"]`);
  card?.remove();
  if (allPolls.length === 0 && !hasMore) {
    document.getElementById("settings-box-polls")!.innerHTML = `<p class="feed-empty">nothing here.</p>`;
  }
}

async function loadPolls() {
  const feed = document.getElementById("settings-box-polls")!;
  allPolls = [];
  nextCursor = null;
  hasMore = false;
  feed.innerHTML = `<p class="feed-loading">loading...</p>`;

  const params = new URLSearchParams({ limit: "10" });
  if (typeFilter !== "all") params.set("kind", typeFilter);
  if (showUnapprovedOnly) params.set("approved", "false");
  const res = await fetch(`${API.polls.getMyPolls}?${params}`, {
    headers: { Authorization: `Bearer ${userId}` },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    feed.innerHTML = `<p class="feed-error">${body?.detail ?? "failed to load polls."}</p>`;
    return;
  }

  const data = await res.json();
  allPolls = data.polls;
  nextCursor = data.next_cursor;
  hasMore = data.has_more;
  renderPolls();
}

async function loadMorePolls() {
  if (!hasMore || isLoadingPolls || !nextCursor) return;
  isLoadingPolls = true;

  const params = new URLSearchParams({ limit: "10", cursor: nextCursor });
  if (typeFilter !== "all") params.set("kind", typeFilter);
  if (showUnapprovedOnly) params.set("approved", "false");
  const res = await fetch(`${API.polls.getMyPolls}?${params}`, {
    headers: { Authorization: `Bearer ${userId}` },
  });

  if (!res.ok) { isLoadingPolls = false; return; }

  const data = await res.json();
  allPolls = [...allPolls, ...data.polls];
  nextCursor = data.next_cursor;
  hasMore = data.has_more;
  renderPolls();
  isLoadingPolls = false;
}

const unapprovedBtn = document.getElementById(
  "filter-unapproved",
) as HTMLButtonElement;
unapprovedBtn?.addEventListener("click", () => {
  showUnapprovedOnly = !showUnapprovedOnly;
  unapprovedBtn.classList.toggle("active", showUnapprovedOnly);
  loadPolls();
});

document.querySelectorAll<HTMLButtonElement>(".type-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    typeFilter = (tab.dataset.type as "all" | Kind) ?? "all";
    document
      .querySelectorAll<HTMLButtonElement>(".type-tab")
      .forEach((t) => t.classList.toggle("active", t === tab));
    loadPolls();
  });
});

const settingsSentinel = document.getElementById("settings-polls-sentinel")!;
const settingsObserver = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting) loadMorePolls();
}, { rootMargin: "200px" });
settingsObserver.observe(settingsSentinel);

loadUserInfo();
loadPolls();
checkMaintenance();

if ("Notification" in window && Notification.permission !== "granted") {
  (document.getElementById("notification-hint") as HTMLElement).style.display = "";
}

// ---- account edit ----

const feedbackEl = document.getElementById("username-feedback") as HTMLElement;
const passwordFeedbackEl = document.getElementById("password-feedback") as HTMLElement;

function showFeedback(el: HTMLElement, msg: string, isError: boolean) {
  el.textContent = msg;
  el.style.color = isError ? "var(--danger)" : "var(--positive)";
  setTimeout(() => (el.textContent = ""), 3000);
}

document.getElementById("btn-change-username")!.addEventListener("click", async () => {
  const newUsername = (document.getElementById("input-new-handle") as HTMLInputElement).value.trim();
  if (!newUsername) return;
  const res = await fetch(API.auth.changeUsername, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${userId}` },
    body: JSON.stringify({ username: newUsername }),
  });
  const data = await res.json();
  if (res.ok) {
    showFeedback(feedbackEl, "username updated", false);
    (document.getElementById("input-new-handle") as HTMLInputElement).value = "";
    loadUserInfo();
  } else {
    showFeedback(feedbackEl, data.detail ?? "failed", true);
  }
});

document.getElementById("btn-change-password")!.addEventListener("click", async () => {
  const current = (document.getElementById("input-current-password") as HTMLInputElement).value;
  const next = (document.getElementById("input-new-password") as HTMLInputElement).value;
  if (!current || !next) return;
  const res = await fetch(API.auth.changePassword, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${userId}` },
    body: JSON.stringify({ current_password: current, new_password: next }),
  });
  const data = await res.json();
  if (res.ok) {
    showFeedback(passwordFeedbackEl, "password updated", false);
    (document.getElementById("input-current-password") as HTMLInputElement).value = "";
    (document.getElementById("input-new-password") as HTMLInputElement).value = "";
  } else {
    showFeedback(passwordFeedbackEl, data.detail ?? "failed", true);
  }
});

document.getElementById("btn-delete-account")!.addEventListener("click", async () => {
  const confirmText = (document.getElementById("input-delete-confirm") as HTMLInputElement).value.trim();
  const deleteFeedback = document.getElementById("delete-feedback") as HTMLElement;
  if (confirmText !== "DELETE ACCOUNT") {
    deleteFeedback.textContent = 'type "DELETE ACCOUNT" to confirm';
    deleteFeedback.style.color = "var(--danger)";
    return;
  }
  deleteFeedback.textContent = "";
  const res = await fetch(API.auth.deleteAccount, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${userId}` },
  });
  if (res.ok) {
    document.cookie.split(";").forEach((c) => {
      document.cookie = c.trim().split("=")[0] + "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/";
    });
    window.location.replace("/login");
  } else {
    const data = await res.json();
    showFeedback(deleteFeedback, data.detail ?? "failed", true);
  }
});
