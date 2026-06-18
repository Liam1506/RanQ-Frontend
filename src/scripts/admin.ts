import { API } from "../config/api";
import { getCookie } from "../utils/cookies";

const userId = getCookie("userId");
if (!userId) {
  window.location.replace("/login");
}
if (getCookie("isAdmin") !== "true") {
  window.location.replace("/start");
}

type Poll = {
  id: string;
  question: string;
  created_by: string;
  creator_username: string | null;
  created_at: string | null;
  approved: boolean;
  voted_option_id: string | null;
  options: Array<{ id: string; option: string; votes: number }>;
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

async function loadUnapprovedPolls() {
  const res = await fetch(API.polls.getUnapproved, {
    headers: { Authorization: `Bearer ${userId}` },
  });

  const feed = document.getElementById("admin-box-polls")!;

  if (!res.ok) {
    feed.innerHTML = `<p class="feed-error">failed to load polls.</p>`;
    return;
  }

  const polls: Poll[] = await res.json();

  if (polls.length === 0) {
    feed.innerHTML = `<p class="feed-empty">currently no polls to approve.</p>`;
    return;
  }

  const unapprovedPolls = polls.filter((poll) => !poll.approved);

  if (unapprovedPolls.length === 0) {
    feed.innerHTML = `<p class="feed-empty">no unapproved polls.</p>`;
    return;
  }

  feed.innerHTML = "";

  unapprovedPolls.forEach((poll, i) => {
    const total = poll.options.reduce((s, o) => s + o.votes, 0);

    const optionsHtml = poll.options
      .map((opt) => {
        const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0;
        return `
          <li class="poll-option" non-clickable>
            <div class="poll-option-bar" style="width:0%"></div>
            <span class="poll-option-label">${opt.option}</span>
            <span class="poll-option-pct">${pct}%</span>
          </li>`;
      })
      .join("");

    const meta = [
      `${total} vote${total !== 1 ? "s" : ""}`,
      poll.creator_username ? `by ${poll.creator_username}` : "",
      poll.created_at ? formatDate(poll.created_at) : "",
    ]
      .filter(Boolean)
      .join(" · ");

    const contentHtml = poll.kind === "post"
      ? `<p class="poll-body">${poll.body ?? ""}</p>`
      : poll.kind === "quote"
        ? `<p class="poll-body poll-body--quote">${poll.body ?? ""}</p>`
        : `<ul class="poll-options">${optionsHtml}</ul>`;

    const tmp = document.createElement("div");
    tmp.innerHTML = `
      <a class="poll-card" style="cursor:default">
        <p class="poll-question">${poll.question}</p>
        ${contentHtml}
        <span class="poll-meta">${meta}</span>
        <div class="poll-card-actions">
          <button class="btn-secondary" data-action="approve" data-poll-id="${poll.id}">Approve</button>
          <button class="btn-secondary" data-action="delete" data-poll-id="${poll.id}">Delete</button>
        </div>
      </a>`;

    const card = tmp.firstElementChild as HTMLElement;
    card.style.animationDelay = `${i * 0.06}s`;

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

    card.querySelector<HTMLButtonElement>('.btn-secondary[data-action="approve"]')!.addEventListener("click", () => {
      approve(poll.id);
    });

    card.querySelector<HTMLButtonElement>('.btn-secondary[data-action="delete"]')!.addEventListener("click", () => {
      deletePoll(poll.id);
    });
  });
}

async function approve(poll_id: string) {
  const res = await fetch(API.polls.approvePoll, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userId}`,
    },
    body: JSON.stringify({ poll_id }),
  });
  if (!res.ok) {
    console.error("failed to approve poll");
    return;
  }
  loadUnapprovedPolls();
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
  loadUnapprovedPolls();
}

async function updateSetting(data: Record<string, unknown>) {
  await fetch(API.siteSettings.update, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userId}`,
    },
    body: JSON.stringify(data),
  });
}

async function loadSettings() {
  const res = await fetch(API.siteSettings.get, {
    headers: { Authorization: `Bearer ${userId}` },
  });
  if (!res.ok) return;
  const s = await res.json();

  (document.getElementById("setting-auto-approve") as HTMLInputElement).checked = s.auto_approve;
  (document.getElementById("setting-allow-registration") as HTMLInputElement).checked =
    s.allow_registration;
  (document.getElementById("setting-maintenance-mode") as HTMLInputElement).checked =
    s.maintenance_mode;
  (document.getElementById("setting-max-options") as HTMLInputElement).value =
    s.max_options_per_poll;
}

document.getElementById("setting-auto-approve")!.addEventListener("change", (e) => {
  updateSetting({ auto_approve: (e.target as HTMLInputElement).checked });
});
document.getElementById("setting-allow-registration")!.addEventListener("change", (e) => {
  updateSetting({ allow_registration: (e.target as HTMLInputElement).checked });
});
document.getElementById("setting-maintenance-mode")!.addEventListener("change", (e) => {
  updateSetting({ maintenance_mode: (e.target as HTMLInputElement).checked });
});
document.getElementById("setting-max-options")!.addEventListener("change", (e) => {
  updateSetting({ max_options_per_poll: parseInt((e.target as HTMLInputElement).value) });
});

loadUnapprovedPolls();
loadSettings();
loadStats();

async function loadStats() {
  const res = await fetch(API.siteSettings.stats, {
    headers: { Authorization: `Bearer ${userId}` },
  });
  if (!res.ok) return;
  const { totals, daily } = await res.json();

  drawBarChart(document.getElementById("stats-totals") as HTMLCanvasElement, {
    users: totals.users,
    verified: totals.verified_users,
    polls: totals.polls,
    posts: totals.posts,
    votes: totals.votes,
    likes: totals.likes,
    comments: totals.comments,
  });

  drawLineChart(document.getElementById("stats-activity") as HTMLCanvasElement, daily);
}

function drawBarChart(canvas: HTMLCanvasElement, data: Record<string, number>) {
  const ctx = canvas.getContext("2d")!;
  const labels = Object.keys(data);
  const values = Object.values(data);
  const max = Math.max(...values, 1);
  const padding = 40;
  const barWidth = (canvas.width - padding * 2) / labels.length;
  const chartHeight = canvas.height - padding * 2;
  const textColor = getComputedStyle(document.documentElement)
    .getPropertyValue("--color-text")
    .trim();

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = "14px monospace";
  ctx.textAlign = "center";

  labels.forEach((label, i) => {
    const barHeight = (values[i] / max) * chartHeight;
    const x = padding + i * barWidth + barWidth * 0.1;
    const y = padding + chartHeight - barHeight;
    const w = barWidth * 0.8;

    ctx.fillStyle = "#e2b714";
    ctx.fillRect(x, y, w, barHeight);

    ctx.fillStyle = textColor;
    ctx.fillText(label, x + w / 2, canvas.height - 10);
    ctx.fillText(String(values[i]), x + w / 2, y - 5);
  });
}

function drawLineChart(
  canvas: HTMLCanvasElement,
  daily: Array<{ day: string; event_type: string; count: number }>,
) {
  const ctx = canvas.getContext("2d")!;

  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  const counts: Record<string, number> = {};
  days.forEach((d) => (counts[d] = 0));
  daily.forEach((entry) => {
    if (counts[entry.day] !== undefined) counts[entry.day] += entry.count;
  });

  const values = days.map((d) => counts[d]);
  const max = Math.max(...values, 1);
  const padding = 40;
  const chartHeight = canvas.height - padding * 2;
  const stepX = (canvas.width - padding * 2) / (days.length - 1);
  const textColor = getComputedStyle(document.documentElement)
    .getPropertyValue("--color-text")
    .trim();

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.beginPath();
  ctx.strokeStyle = "#e2b714";
  ctx.lineWidth = 2;
  values.forEach((val, i) => {
    const x = padding + i * stepX;
    const y = padding + chartHeight - (val / max) * chartHeight;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.font = "12px monospace";
  ctx.textAlign = "center";
  values.forEach((val, i) => {
    const x = padding + i * stepX;
    const y = padding + chartHeight - (val / max) * chartHeight;

    ctx.fillStyle = "#e2b714";
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = textColor;
    ctx.fillText(days[i].slice(5), x, canvas.height - 10);
    if (val > 0) ctx.fillText(String(val), x, y - 8);
  });
}

document.getElementById("cleanup-btn")!.addEventListener("click", async () => {
  const btn = document.getElementById("cleanup-btn") as HTMLButtonElement;
  const result = document.getElementById("cleanup-result")!;
  btn.disabled = true;
  btn.textContent = "running...";
  result.textContent = "";

  try {
    const res = await fetch(API.siteSettings.cleanup, {
      method: "POST",
      headers: { Authorization: `Bearer ${userId}` },
    });
    if (!res.ok) {
      result.textContent = "cleanup failed.";
      return;
    }
    const data = await res.json();
    result.textContent = `users: ${data.deleted_unverified_users} · waitlist: ${data.deleted_verifies} · notifications: ${data.deleted_notifications}`;
  } catch {
    result.textContent = "network error.";
  } finally {
    btn.disabled = false;
    btn.textContent = "run";
  }
});
