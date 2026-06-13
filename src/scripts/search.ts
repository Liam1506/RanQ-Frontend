import { API } from "../config/api";
import { getCookie } from "../utils/cookies";

const userId = getCookie("userId");
if (!userId) window.location.replace("/login");

const input = document.getElementById("search-input") as HTMLInputElement;
const noResults = document.getElementById("no-results") as HTMLParagraphElement;
const searchHint = document.getElementById("search-hint") as HTMLParagraphElement;
const postList = document.getElementById("post-list") as HTMLElement;

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const response = await fetch(API.polls.getAll, {
  headers: { Authorization: `Bearer ${userId}` },
});

if (!response.ok) {
  postList.innerHTML = `<p class="feed-error">failed to load posts.</p>`;
} else {
  const posts = await response.json();
  postList.innerHTML = posts
    .map(
      (post: any) => {
        const totalVotes = post.options.reduce((s: number, o: any) => s + o.votes, 0);
        const options = post.options.map((opt: any) => {
          const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
          return `
            <li class="poll-option">
              <div class="poll-option-bar" style="width:${pct}%"></div>
              <span class="poll-option-label">${escapeAttr(opt.option)}</span>
              <span class="poll-option-pct">${pct}%</span>
            </li>`;
        }).join("");
        const username = post.creator_username ?? "";
        return `
        <div class="post-wrapper hidden" data-question="${escapeAttr(post.question ?? "")}" data-username="${escapeAttr(username)}">
          <a class="poll-card" href="/poll?id=${post.id}">
            <p class="poll-question">${escapeAttr(post.question)}</p>
            <ul class="poll-options">${options}</ul>
            <span class="poll-meta">${totalVotes} vote${totalVotes !== 1 ? "s" : ""}${username ? " · @" + escapeAttr(username) : ""}</span>
          </a>
        </div>`;
      },
    )
    .join("");
}
const postWrapper = postList.querySelectorAll<HTMLElement>(".post-wrapper");

input.addEventListener("input", () => {
  const raw = input.value.trim().toLowerCase();
  // allow typing "@alice" and still match username "alice"
  const query = raw.startsWith("@") ? raw.slice(1) : raw;

  if (query === "") {
    postWrapper.forEach((w) => w.classList.add("hidden"));
    noResults.classList.add("hidden");
    searchHint.classList.remove("hidden");
    return;
  }

  searchHint.classList.add("hidden");

  let foundAny = false;

  postWrapper.forEach((wrapper) => {
    const username = (wrapper.dataset.username ?? "").toLowerCase();
    const question = (wrapper.dataset.question ?? "").toLowerCase();
    const matches = username.includes(query) || question.includes(query);
    wrapper.classList.toggle("hidden", !matches);
    if (matches) foundAny = true;
  });

  noResults.classList.toggle("hidden", foundAny);
});
