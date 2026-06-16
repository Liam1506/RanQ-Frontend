import { API } from "../config/api";
import { getCookie } from "../utils/cookies";

const userId = getCookie("userId");
if (!userId) window.location.replace("/login");

const pollId = new URLSearchParams(window.location.search).get("id")!;

type Option = { id: string; option: string; votes: number };
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
  total_up_down_score: number;
  user_vote_up_down: number | null; // -1, 0, 1, or null
  options: Option[];
};

type Comment = {
  id: string;
  poll_id: string;
  created_by: string;
  creator_id: string | null;
  content: string;
  created_at: string | null;
};

// in-memory state so vote / comment can update the DOM in place
// rather than re-fetching and re-rendering (which causes a flash)
let currentPoll: Poll | null = null;
let rankingListEl: HTMLUListElement | null = null;
let rankingMetaEl: HTMLElement | null = null;
let currentComments: Comment[] = [];
let commentListEl: HTMLUListElement | null = null;
let commentHeadingEl: HTMLElement | null = null;
// Frozen ranking order for the detail page: captured on first render so the
// user's own vote doesn't visibly shuffle the rows. The feed re-sorts when
// the user comes back; this only locks the order while on /poll.
let rankingOrder: string[] | null = null;

const backBtn = document.createElement("button");
backBtn.className = "back-btn";
backBtn.textContent = "← back";
backBtn.addEventListener("click", () => history.back());
document.getElementById("poll-detail")!.before(backBtn);

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

async function loadPoll() {
  const container = document.getElementById("poll-detail")!;
  container.innerHTML = "";
  // Drop the frozen order so the next applyRanking() captures fresh from the
  // server-authoritative state (matters on the post-error refetch path).
  rankingOrder = null;

  const res = await fetch(API.polls.getAll, {
    headers: { Authorization: `Bearer ${userId}` },
  });

  if (!res.ok) {
    container.textContent = "failed to load ranking.";
    return;
  }

  const polls: Poll[] = await res.json();
  const poll = polls.find((p) => p.id === pollId);
  if (!poll) {
    container.textContent = "ranking not found.";
    return;
  }

  renderPoll(container, poll);
  loadComment(pollId);
}

function renderPoll(container: HTMLElement, poll: Poll) {
  const card = document.createElement("div");
  card.className = "poll-card poll-card--detail";

  const header = document.createElement("div");
  header.className = "poll-card-header";

  const question = document.createElement("p");
  question.className = "poll-question";
  question.textContent = poll.question;

  const dateSpan = document.createElement("span");
  dateSpan.className = "poll-meta-date";
  dateSpan.textContent = poll.created_at ? formatDate(poll.created_at) : "";

  header.append(question, dateSpan);
  card.append(header);

  if (poll.kind === "post") {
    const body = document.createElement("p");
    body.className = "poll-body poll-body--detail";
    body.textContent = poll.body;
    card.append(body);

    const footer = document.createElement("div");
    footer.className = "poll-card-footer";
    footer.append(document.createElement("span"));
    const authorSpan = document.createElement("span");
    authorSpan.className = "poll-meta poll-meta-author";
    authorSpan.textContent = poll.creator_username ? `@${poll.creator_username}` : "anon";
    footer.append(authorSpan);
    card.append(footer);

    const likeRow = renderLikeRow(poll);
    card.append(likeRow);

    container.append(card);
    return;
  }

  // ranking
  currentPoll = poll;

  const optionsList = document.createElement("ul");
  optionsList.className = "poll-options poll-options--ranked";
  rankingListEl = optionsList;

  const metaRow = document.createElement("div");
  metaRow.className = "poll-card-footer poll-card-footer--ranking";

  const meta = document.createElement("span");
  meta.className = "poll-meta";
  rankingMetaEl = meta;

  const authorSpan = document.createElement("span");
  authorSpan.className = "poll-meta poll-meta-author";
  authorSpan.textContent = poll.creator_username ? `@${poll.creator_username}` : "anon";

  metaRow.append(meta, authorSpan);

  const upDownRow = renderUpDownRow(poll);

  const actionRow = document.createElement("div");
  actionRow.className = "poll-action-row";
  actionRow.append(upDownRow);

  if (navigator.share) {
    const shareBtn = document.createElement("button");
    shareBtn.type = "button";
    shareBtn.className = "share-btn";
    shareBtn.textContent = "share";
    shareBtn.addEventListener("click", () => {
      const url = `${window.location.origin}/poll?id=${poll.id}`;
      const author = poll.creator_username ? `@${poll.creator_username}` : "anon";
      const date = poll.created_at ? formatDate(poll.created_at) : "";
      const total = poll.options.reduce((s, o) => s + o.votes, 0);
      const sorted = [...poll.options].sort((a, b) => b.votes - a.votes);
      const bars = sorted.map((o) => {
        const pct = total > 0 ? Math.round((o.votes / total) * 100) : 0;
        const filled = Math.round(pct / 10);
        const bar = "█".repeat(filled) + "░".repeat(10 - filled);
        return `${bar} ${pct}%  ${o.option}`;
      }).join("\n");
      navigator.share({
        text: `# ${poll.question}\n\n${bars}\n\n${total} votes · ${author} · ${date}\n${url}`,
      });
    });
    actionRow.append(shareBtn);
  }

  card.append(optionsList, metaRow, actionRow);

  container.append(card);

  applyRanking({ animateFromZero: true });
}

function applyRanking({ animateFromZero = false } = {}) {
  if (!currentPoll || !rankingListEl || !rankingMetaEl) return;
  const poll = currentPoll;
  const list = rankingListEl;

  const total = poll.options.reduce((s, o) => s + o.votes, 0);

  // Capture the ranking order on first render and keep it frozen while the
  // user is on the detail page. Their own vote should change percentages and
  // bars, NOT the row order — that re-shuffle is jarring. The feed will
  // re-sort when they navigate back.
  if (rankingOrder === null) {
    rankingOrder = [...poll.options].sort((a, b) => b.votes - a.votes).map((o) => o.id);
  }
  const byId = new Map(poll.options.map((o) => [o.id, o]));
  const ranked = rankingOrder
    .map((id) => byId.get(id))
    .filter((o): o is (typeof poll.options)[number] => Boolean(o));
  // Leader follows the frozen order (the row shown at index 0). The user's
  // own vote shouldn't suddenly make a different row light up either.
  const leaderId = rankingOrder[0];

  // index existing rows by option id so we can update in place
  const existing = new Map<string, HTMLLIElement>();
  list.querySelectorAll<HTMLLIElement>("li.poll-option").forEach((li) => {
    if (li.dataset.optId) existing.set(li.dataset.optId, li);
  });

  const targets: Array<{ bar: HTMLElement; width: string }> = [];

  ranked.forEach((opt) => {
    const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0;
    const isVoted = opt.id === poll.voted_option_id;
    let li = existing.get(opt.id);

    if (!li) {
      li = document.createElement("li");
      li.dataset.optId = opt.id;
      li.style.cursor = "pointer";

      const bar = document.createElement("div");
      bar.className = "poll-option-bar";
      bar.style.width = "0";

      const label = document.createElement("span");
      label.className = "poll-option-label";
      label.textContent = opt.option;

      const pctSpan = document.createElement("span");
      pctSpan.className = "poll-option-pct";

      const count = document.createElement("span");
      count.className = "poll-option-count";

      li.append(bar, label, pctSpan, count);
      li.addEventListener("click", () => castVote(opt.id));
      li.setAttribute("tabindex", "0");
      li.setAttribute("role", "button");
      li.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          castVote(opt.id);
        }
      });
    }

    li.className = `poll-option poll-option--ranked${isVoted ? " poll-option--voted" : ""}${opt.id === leaderId ? " poll-option--leader" : ""}`;

    li.querySelector(".poll-option-pct")!.textContent = `${pct}%`;
    li.querySelector(".poll-option-count")!.textContent = String(opt.votes);

    const bar = li.querySelector<HTMLElement>(".poll-option-bar")!;
    if (animateFromZero) bar.style.width = "0";
    targets.push({ bar, width: `${pct}%` });

    // re-append in frozen order; this is a move, not a destroy
    list.appendChild(li);
  });

  rankingMetaEl.textContent = `${total} vote${total !== 1 ? "s" : ""}`;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      targets.forEach(({ bar, width }) => (bar.style.width = width));
    });
  });
}

async function castVote(optionId: string) {
  if (!currentPoll) return;
  const poll = currentPoll;
  const previousVoteId = poll.voted_option_id;

  // optimistic update
  if (previousVoteId === optionId) {
    // un-vote
    const prev = poll.options.find((o) => o.id === optionId);
    if (prev) prev.votes = Math.max(0, prev.votes - 1);
    poll.voted_option_id = null;
  } else {
    if (previousVoteId) {
      const old = poll.options.find((o) => o.id === previousVoteId);
      if (old) old.votes = Math.max(0, old.votes - 1);
    }
    const next = poll.options.find((o) => o.id === optionId);
    if (next) next.votes += 1;
    poll.voted_option_id = optionId;
  }
  applyRanking();
  stagePendingUpdate(poll.id, {
    voted_option_id: poll.voted_option_id,
    options: poll.options.map((o) => ({ ...o })),
  });

  const res = await fetch(API.polls.vote, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userId}`,
    },
    body: JSON.stringify({ poll_id: poll.id, option_id: optionId }),
  });

  if (!res.ok) {
    // server rejected — refetch authoritative state
    loadPoll();
  }
}

// Write a partial update to sessionStorage so the feed page can pick it up
// instantly when the user navigates back, before the silent refetch finishes.
function renderUpDownRow(poll: Poll): HTMLDivElement {
  const row = document.createElement("div");
  row.className = "updown-row";

  const up = document.createElement("button");
  up.type = "button";
  up.className = "updown-btn updown-btn--up";
  up.setAttribute("aria-label", "upvote");
  up.textContent = "▲";

  const score = document.createElement("span");
  score.className = "updown-score";

  const down = document.createElement("button");
  down.type = "button";
  down.className = "updown-btn updown-btn--down";
  down.setAttribute("aria-label", "downvote");
  down.textContent = "▼";

  row.append(up, score, down);
  syncUpDown(poll, up, score, down);

  up.addEventListener("click", () => castUpDownVote(poll, 1, up, score, down));
  down.addEventListener("click", () => castUpDownVote(poll, -1, up, score, down));

  return row;
}

function syncUpDown(
  poll: Poll,
  up: HTMLButtonElement,
  score: HTMLElement,
  down: HTMLButtonElement,
) {
  const v = poll.user_vote_up_down ?? 0;
  score.textContent = String(poll.total_up_down_score);
  up.classList.toggle("active", v === 1);
  down.classList.toggle("active", v === -1);
}

async function castUpDownVote(
  poll: Poll,
  direction: 1 | -1,
  up: HTMLButtonElement,
  score: HTMLElement,
  down: HTMLButtonElement,
) {
  const prev = poll.user_vote_up_down ?? 0;
  // Clicking the already-active direction removes the vote
  const next: 0 | 1 | -1 = prev === direction ? 0 : direction;

  // Optimistic update
  poll.total_up_down_score += next - prev;
  poll.user_vote_up_down = next === 0 ? null : next;
  syncUpDown(poll, up, score, down);

  const res = await fetch(API.polls.redditVote, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userId}`,
    },
    body: JSON.stringify({ poll_id: poll.id, voting_score: next }),
  });

  if (!res.ok) {
    // Roll back
    poll.total_up_down_score -= next - prev;
    poll.user_vote_up_down = prev === 0 ? null : prev;
    syncUpDown(poll, up, score, down);
    return;
  }
  // Stage after server confirms so the feed meta line reflects the right score
  stagePendingUpdate(poll.id, {
    total_up_down_score: poll.total_up_down_score,
  });
}

function stagePendingUpdate(pollId: string, patch: Record<string, unknown>) {
  let updates: Record<string, Record<string, unknown>> = {};
  try {
    const raw = sessionStorage.getItem("pendingPollUpdates");
    if (raw) updates = JSON.parse(raw);
  } catch {
    /* ignore malformed storage */
  }
  updates[pollId] = { ...(updates[pollId] ?? {}), ...patch };
  sessionStorage.setItem("pendingPollUpdates", JSON.stringify(updates));
}

function renderLikeRow(poll: Poll): HTMLDivElement {
  const row = document.createElement("div");
  row.className = "post-like-row";
  row.dataset.pollId = poll.id;

  const button = document.createElement("button");
  button.type = "button";
  button.className = `like-btn${poll.user_has_liked ? " liked" : ""}`;
  button.setAttribute("aria-pressed", String(poll.user_has_liked));

  const count = document.createElement("span");
  count.className = "like-count";
  count.textContent = String(poll.like_count);

  const label = document.createElement("span");
  label.className = "like-label";
  label.textContent = poll.like_count === 1 ? "like" : "likes";
  button.append(count, label);
  button.addEventListener("click", () => toggleLike(poll, button, count, label));

  row.append(button);

  if (navigator.share) {
    const shareBtn = document.createElement("button");
    shareBtn.type = "button";
    shareBtn.className = "share-btn";
    shareBtn.textContent = "share";
    shareBtn.addEventListener("click", () => {
      const author = poll.creator_username ? `@${poll.creator_username}` : "anon";
      const date = poll.created_at ? formatDate(poll.created_at) : "";
      const url = `${window.location.origin}/poll?id=${poll.id}`;
      navigator.share({
        title: poll.question,
        text: `# ${poll.question}\n\n${poll.body}\n${author} · ${date}`,
        url,
      });
    });
    row.append(shareBtn);
  }

  return row;
}

async function toggleLike(
  poll: Poll,
  button: HTMLButtonElement,
  count: HTMLElement,
  label: HTMLElement,
) {
  const wasLiked = poll.user_has_liked;
  poll.user_has_liked = !wasLiked;
  poll.like_count += wasLiked ? -1 : 1;
  button.classList.toggle("liked", poll.user_has_liked);
  button.setAttribute("aria-pressed", String(poll.user_has_liked));
  count.textContent = String(poll.like_count);
  label.textContent = poll.like_count === 1 ? "like" : "likes";

  const res = await fetch(API.polls.like, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userId}`,
    },
    body: JSON.stringify({ poll_id: poll.id }),
  });

  if (!res.ok) {
    poll.user_has_liked = wasLiked;
    poll.like_count += wasLiked ? 1 : -1;
    button.classList.toggle("liked", poll.user_has_liked);
    button.setAttribute("aria-pressed", String(poll.user_has_liked));
    count.textContent = String(poll.like_count);
    label.textContent = poll.like_count === 1 ? "like" : "likes";
    return;
  }

  const data = await res.json();
  poll.like_count = data.like_count;
  count.textContent = String(poll.like_count);
  label.textContent = poll.like_count === 1 ? "like" : "likes";
  // Stage after server confirms so the feed gets the authoritative count
  stagePendingUpdate(poll.id, {
    user_has_liked: poll.user_has_liked,
    like_count: poll.like_count,
  });
}

async function loadComment(poll_id: string) {
  const res = await fetch(`${API.polls.getAllComments}?poll_id=${poll_id}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${userId}`,
    },
  });
  if (!res.ok) {
    console.error("failed to load comments");
    return;
  }

  const comments: Comment[] = await res.json();
  currentComments = comments;

  const commentContainer = document.getElementById("poll-comments")!;
  commentContainer.innerHTML = "";

  renderComments(commentContainer, pollId, comments);
}

function renderCommentItem(c: Comment): HTMLLIElement {
  const li = document.createElement("li");
  li.className = "comment-item";

  const header = document.createElement("div");
  header.className = "comment-header";

  const author = document.createElement("span");
  author.className = "comment-author";
  author.textContent = `@${c.created_by}`;

  const date = document.createElement("span");
  date.className = "comment-date";
  date.textContent = c.created_at ? formatDate(c.created_at) : "";

  header.append(author, date);

  const body = document.createElement("span");
  body.className = "comment-body";
  body.textContent = c.content;

  li.append(header, body);

  if (getCookie("isAdmin") === "true" || c.creator_id === getCookie("userId")) {
    const actions = document.createElement("div");
    actions.className = "comment-actions";

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "comment-delete-btn";
    deleteBtn.textContent = "delete";
    deleteBtn.addEventListener("click", () => deleteComment(c.id, li));

    actions.append(deleteBtn);
    li.append(actions);
  }

  return li;
}

function updateCommentHeading() {
  if (!commentHeadingEl) return;
  const n = currentComments.length;
  commentHeadingEl.textContent = `${n} comment${n !== 1 ? "s" : ""}`;
}

function renderComments(container: HTMLElement, poll_id: string, comments: Comment[]) {
  const section = document.createElement("div");
  section.className = "comments-section";

  const heading = document.createElement("p");
  heading.className = "comments-heading";
  commentHeadingEl = heading;

  const inputRow = renderCommentCreation(poll_id);

  const list = document.createElement("ul");
  list.className = "comment-list";
  commentListEl = list;

  if (comments.length === 0) {
    const empty = document.createElement("li");
    empty.className = "comment-empty";
    empty.textContent = "no comments yet — be the first.";
    list.append(empty);
  } else {
    for (const c of comments) {
      list.append(renderCommentItem(c));
    }
  }

  updateCommentHeading();
  section.append(heading, inputRow, list);
  container.append(section);
}

function renderCommentCreation(poll_id: string): HTMLDivElement {
  const inputRow = document.createElement("div");
  inputRow.className = "comment-input-row";

  const max = 280;
  const input = document.createElement("textarea");
  input.className = "comment-input";
  input.placeholder = "add a comment...";
  input.maxLength = max;
  input.id = "comment-input";
  input.rows = 1;
  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = input.scrollHeight + "px";
  });

  const counter = document.createElement("span");
  counter.className = "comment-counter";
  counter.style.display = "none";

  input.addEventListener("input", () => {
    const remaining = max - input.value.length;
    if (remaining < 50) {
      counter.style.display = "";
      counter.textContent = String(remaining);
      counter.classList.toggle("comment-counter--low", remaining < 20);
    } else {
      counter.style.display = "none";
    }
  });

  const submitBtn = document.createElement("button");
  submitBtn.className = "comment-submit-btn";
  submitBtn.textContent = "post";

  submitBtn.addEventListener("click", () => {
    const comment = input.value;
    if (!comment.trim()) return;
    createComment(poll_id, comment);
    input.value = "";
    counter.style.display = "none";
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const comment = input.value;
      if (!comment.trim()) return;
      createComment(poll_id, comment);
      input.value = "";
      input.style.height = "";
      counter.style.display = "none";
    }
  });

  const wrapper = document.createElement("div");
  wrapper.className = "comment-input-wrapper";

  const buttonRow = document.createElement("div");
  buttonRow.className = "comment-input-row";
  buttonRow.append(input, submitBtn);

  wrapper.append(buttonRow, counter);
  inputRow.append(wrapper);
  return inputRow;
}

async function createComment(poll_id: string, comment: string) {
  const res = await fetch(API.polls.comment, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userId}`,
    },
    body: JSON.stringify({ poll_id, comment }),
  });
  if (!res.ok) {
    console.error("comment could not be posted");
    return;
  }

  const created: Comment = await res.json();
  currentComments = [created, ...currentComments];

  if (commentListEl) {
    // wipe the "no comments yet" placeholder if present
    const empty = commentListEl.querySelector(".comment-empty");
    if (empty) empty.remove();
    commentListEl.prepend(renderCommentItem(created));
  }
  updateCommentHeading();
  if (currentPoll) {
    currentPoll.comment_count = currentComments.length;
    stagePendingUpdate(poll_id, { comment_count: currentPoll.comment_count });
  }
}

async function deleteComment(commentId: string, li: HTMLLIElement) {
  const res = await fetch(API.polls.deleteComment, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userId}`,
    },
    body: JSON.stringify({ id: commentId }),
  });
  if (!res.ok) {
    console.error("failed to delete comment");
    return;
  }
  li.remove();
  currentComments = currentComments.filter((c) => c.id !== commentId);
  updateCommentHeading();
}

loadPoll();
