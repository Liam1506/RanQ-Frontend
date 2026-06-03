import { API } from "../config/api";
import { getCookie } from "../utils/cookies";

const userId = getCookie("userId");
if (!userId) window.location.replace("/login");

getUserInfo(userId!);

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

let allPolls: Poll[] = [];
let showUnapprovedOnly = false;

function getUserInfo(user_id: string) {
  const info_user_id = document.getElementById(
    "info-user-id",
  ) as HTMLSpanElement;
  info_user_id.innerHTML = user_id;
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

function renderPolls() {
  const feed = document.getElementById("settings-box-polls")!;
  const polls = showUnapprovedOnly
    ? allPolls.filter((p) => !p.approved)
    : allPolls;

  if (polls.length === 0) {
    feed.innerHTML = showUnapprovedOnly
      ? `<p class="feed-empty">no unapproved polls.</p>`
      : `<p class="feed-empty">no polls yet.</p>`;
    return;
  }

  feed.innerHTML = "";

  polls.forEach((poll, i) => {
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

    card
      .querySelector<HTMLButtonElement>(".delete-btn")!
      .addEventListener("click", () => {
        deletePoll(poll.id);
      });
  });
}

async function deletePoll(poll_id: string) {
  console.log("deleted my poll: " + poll_id);
  await loadPolls();
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

loadPolls();
