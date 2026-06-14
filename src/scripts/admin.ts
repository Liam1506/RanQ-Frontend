import { API } from "../config/api";
import { getCookie } from "../utils/cookies";

const userId = getCookie("userId");
if (!userId) {
  window.location.replace("/login");
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

    const tmp = document.createElement("div");
    tmp.innerHTML = `
      <a class="poll-card" style="cursor:default">
        <p class="poll-question">${poll.question}</p>
        <ul class="poll-options">${optionsHtml}</ul>
        <span class="poll-meta">${meta}</span>
        <div class="poll-card-actions">
          <button class="approve-btn" data-poll-id="${poll.id}">Approve</button>
          <button class="delete-btn" data-poll-id="${poll.id}">Delete</button>
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

    card.querySelector<HTMLButtonElement>(".approve-btn")!.addEventListener("click", () => {
      approve(poll.id);
    });

    card.querySelector<HTMLButtonElement>(".delete-btn")!.addEventListener("click", () => {
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
