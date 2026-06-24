import { API } from "../config/api";
import { authedFetch, authedPost } from "../utils/api-client";
import { getCookie } from "../utils/cookies";
import { escapeHtml, formatDate } from "../utils/format";

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
  kind: "ranking" | "post" | "quote";
  body: string | null;
};

async function loadUnapprovedPolls() {
  const res = await authedFetch(API.polls.getUnapproved);

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

  feed.innerHTML = "";

  polls.forEach((poll, i) => {
    const total = poll.options.reduce((s, o) => s + o.votes, 0);

    const optionsHtml = poll.options
      .map((opt) => {
        const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0;
        return `
          <li class="poll-option poll-option--static">
            <div class="poll-option-bar" style="width:0%"></div>
            <span class="poll-option-label">${escapeHtml(opt.option)}</span>
            <span class="poll-option-pct">${pct}%</span>
          </li>`;
      })
      .join("");

    const meta = [
      `${total} vote${total !== 1 ? "s" : ""}`,
      poll.creator_username ? `by ${escapeHtml(poll.creator_username)}` : "",
      poll.created_at ? formatDate(poll.created_at) : "",
    ]
      .filter(Boolean)
      .join(" · ");

    const contentHtml =
      poll.kind === "post"
        ? `<p class="poll-body">${escapeHtml(poll.body ?? "")}</p>`
        : poll.kind === "quote"
          ? `<p class="poll-body poll-body--quote">${escapeHtml(poll.body ?? "")}</p>`
          : `<ul class="poll-options">${optionsHtml}</ul>`;

    const tmp = document.createElement("div");
    tmp.innerHTML = `
      <div class="poll-card poll-card--static">
        <p class="poll-question">${escapeHtml(poll.question)}</p>
        ${contentHtml}
        <span class="poll-meta">${meta}</span>
        <div class="poll-card-actions">
          <button class="btn-secondary btn--positive" data-action="approve" data-poll-id="${poll.id}">approve</button>
          <span style="flex:1"></span>
          <button class="btn-secondary btn--danger" data-action="delete" data-poll-id="${poll.id}">delete</button>
        </div>
      </div>`;

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

    card
      .querySelector<HTMLButtonElement>('.btn-secondary[data-action="approve"]')!
      .addEventListener("click", () => {
        card.remove();
        if (feed.children.length === 0)
          feed.innerHTML = `<p class="feed-empty">currently no polls to approve.</p>`;
        approve(poll.id);
      });

    card
      .querySelector<HTMLButtonElement>('.btn-secondary[data-action="delete"]')!
      .addEventListener("click", () => {
        card.remove();
        if (feed.children.length === 0)
          feed.innerHTML = `<p class="feed-empty">currently no polls to approve.</p>`;
        deletePoll(poll.id);
      });
  });
}

async function approve(poll_id: string) {
  await authedPost(API.polls.approvePoll, { poll_id });
}

async function deletePoll(poll_id: string) {
  await authedFetch(API.polls.delete, {
    method: "DELETE",
    body: { id: poll_id },
  });
}

async function updateSetting(data: Record<string, unknown>) {
  await authedPost(API.siteSettings.update, data);
}

async function loadSettings() {
  const res = await authedFetch(API.siteSettings.get);
  if (!res.ok) return;
  const s = await res.json();

  (document.getElementById("setting-auto-approve") as HTMLInputElement).checked = s.auto_approve;
  (document.getElementById("setting-allow-registration") as HTMLInputElement).checked =
    s.allow_registration;
  (document.getElementById("setting-maintenance-mode") as HTMLInputElement).checked =
    s.maintenance_mode;
  (document.getElementById("setting-show-trailer") as HTMLInputElement).checked =
    s.show_trailer_button;
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
document.getElementById("setting-show-trailer")!.addEventListener("change", (e) => {
  updateSetting({ show_trailer_button: (e.target as HTMLInputElement).checked });
});
document.getElementById("setting-max-options")!.addEventListener("change", (e) => {
  updateSetting({ max_options_per_poll: parseInt((e.target as HTMLInputElement).value) });
});

async function loadStats() {
  const res = await authedFetch(API.siteSettings.stats);
  if (!res.ok) return;
  const { totals, daily } = await res.json();

  drawBarChart(document.getElementById("stats-totals") as HTMLCanvasElement, {
    users: totals.users,
    verified: totals.verified_users,
    polls: totals.polls,
    posts: totals.posts,
    votes: totals.votes,
    comments: totals.comments,
  });

  drawLineChart(document.getElementById("stats-activity") as HTMLCanvasElement, daily);
}

loadUnapprovedPolls();
loadSettings();
loadStats();

function drawBarChart(canvas: HTMLCanvasElement, data: Record<string, number>) {
  canvas.width = canvas.offsetWidth || 600;
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
  canvas.width = canvas.offsetWidth || 600;
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
    if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
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
    const labelY = y - 8 < padding ? y + 14 : y - 8;
    ctx.fillText(String(val), x, labelY);
  });
}

document.getElementById("cleanup-btn")!.addEventListener("click", async () => {
  const btn = document.getElementById("cleanup-btn") as HTMLButtonElement;
  const result = document.getElementById("cleanup-result")!;
  btn.disabled = true;
  btn.textContent = "running...";
  result.textContent = "";

  try {
    const res = await authedFetch(API.siteSettings.cleanup, {
      method: "POST",
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
