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
  total_up_down_score: number;
  user_vote_up_down: number;
  options: Array<{ id: string; option: string; votes: number }>;
};

let allPolls: Poll[] = [];
let showUnvoted = false;

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

function renderPoll(poll: Poll): string {
  const total = totalVotes(poll);
  const options = poll.options
    .map((opt) => {
      const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0;
      const isVoted = opt.id === poll.voted_option_id;
      return `
        <li class="poll-option${isVoted ? " poll-option--voted" : ""}">
          <div class="poll-option-bar" style="width:${pct}%"></div>
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

  const upvoted = poll.user_vote_up_down === 1;
  const downvoted = poll.user_vote_up_down === -1;

  return `
    <a class="poll-card" href="/poll?id=${poll.id}">
      <p class="poll-question">${poll.question}</p>
      <ul class="poll-options">${options}</ul>
      <span class="poll-meta">${meta} <span class="vote-btns">
        <button class="upvote-btn${upvoted ? " upvoted" : ""}" data-poll-id="${poll.id}">▲</button>
        <span class="reddit-score" data-poll-id="${poll.id}">${poll.total_up_down_score}</span>
        <button class="downvote-btn${downvoted ? " downvoted" : ""}" data-poll-id="${poll.id}">▼</button>
      </span></span>
    </a>`;
}

function applyFilters() {
  const sort = (document.getElementById("filter-sort") as HTMLSelectElement)
    .value;

  const feed = document.getElementById("feed")!;

  let polls = [...allPolls];

  if (showUnvoted) {
    polls = polls.filter((p) => p.voted_option_id === null);
  }

  if (sort === "oldest") {
    polls = polls.slice().reverse();
  } else if (sort === "popular") {
    polls = polls.slice().sort((a, b) => totalVotes(b) - totalVotes(a));
  }

  if (polls.length === 0) {
    feed.innerHTML = `<p class="feed-empty">no polls match.</p>`;
    return;
  }

  feed.innerHTML = "";

  polls.forEach((poll, i) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = renderPoll(poll);
    const card = tmp.firstElementChild as HTMLElement;

    card.style.animationDelay = `${i * 0.06}s`;

    const bars = card.querySelectorAll<HTMLElement>(".poll-option-bar");
    const targets = Array.from(bars).map((b) => b.style.width);
    bars.forEach((b) => (b.style.width = "0"));

    feed.appendChild(card);

    card.addEventListener("click", () => {
      sessionStorage.setItem("feedScroll", String(window.scrollY));
    });

    card.querySelector<HTMLButtonElement>(".upvote-btn")?.addEventListener("click", (e) => {
      e.preventDefault();
      const poll = allPolls.find((p) => p.id === card.querySelector<HTMLButtonElement>(".upvote-btn")!.dataset.pollId)!;
      redditVote(poll, poll.user_vote_up_down === 1 ? 0 : 1);
    });

    card.querySelector<HTMLButtonElement>(".downvote-btn")?.addEventListener("click", (e) => {
      e.preventDefault();
      const poll = allPolls.find((p) => p.id === card.querySelector<HTMLButtonElement>(".downvote-btn")!.dataset.pollId)!;
      redditVote(poll, poll.user_vote_up_down === -1 ? 0 : -1);
    });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bars.forEach((b, j) => (b.style.width = targets[j]));
      });
    });
  });
}

async function loadFeed() {
  const res = await fetch(API.polls.getAll, {
    headers: { Authorization: `Bearer ${userId}` },
  });
  const feed = document.getElementById("feed")!;
  if (!res.ok) {
    feed.innerHTML = `<p class="feed-error">failed to load polls.</p>`;
    return;
  }

  allPolls = (await res.json()).filter((p: Poll) => p.approved);
  if (allPolls.length === 0) {
    feed.innerHTML = `<p class="feed-empty">no polls yet.</p>`;
    return;
  }
  applyFilters();

  const savedScroll = sessionStorage.getItem("feedScroll");
  if (savedScroll) {
    sessionStorage.removeItem("feedScroll");
    requestAnimationFrame(() => window.scrollTo(0, parseInt(savedScroll)));
  }

  document
    .getElementById("filter-sort")
    ?.addEventListener("change", applyFilters);

  const unvotedBtn = document.getElementById(
    "filter-unvoted",
  ) as HTMLButtonElement;
  unvotedBtn?.addEventListener("click", () => {
    showUnvoted = !showUnvoted;
    unvotedBtn.classList.toggle("active", showUnvoted);
    applyFilters();
  });
}

async function redditVote(poll: Poll, value: number) {
  const previousVote = poll.user_vote_up_down;

  poll.user_vote_up_down = value;
  const scoreEl = document.querySelector<HTMLElement>(`.reddit-score[data-poll-id="${poll.id}"]`);
  const upBtn = document.querySelector<HTMLButtonElement>(`.upvote-btn[data-poll-id="${poll.id}"]`);
  const downBtn = document.querySelector<HTMLButtonElement>(`.downvote-btn[data-poll-id="${poll.id}"]`);
  if (upBtn) upBtn.classList.toggle("upvoted", value === 1);
  if (downBtn) downBtn.classList.toggle("downvoted", value === -1);

  const res = await fetch(API.polls.redditVote, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userId}`,
    },
    body: JSON.stringify({ poll_id: poll.id, user_id: userId, voting_score: value }),
  });

  if (res.ok) {
    poll.total_up_down_score += value - previousVote;
    if (scoreEl) scoreEl.textContent = String(poll.total_up_down_score);
  } else {
    poll.user_vote_up_down = previousVote;
    if (upBtn) upBtn.classList.toggle("upvoted", previousVote === 1);
    if (downBtn) downBtn.classList.toggle("downvoted", previousVote === -1);
    if (res.status === 409) {
      console.warn("already voted on this poll");
    }
  }
}

loadFeed();
