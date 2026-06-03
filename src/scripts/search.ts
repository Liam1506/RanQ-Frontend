import { API } from "../config/api";
import { getCookie } from "../utils/cookies";

const userId = getCookie("userId");
if (!userId) window.location.replace("/login");

const input = document.getElementById("search-input") as HTMLInputElement;
const noResults = document.getElementById("no-results") as HTMLParagraphElement;
const searchHint = document.getElementById("search-hint") as HTMLParagraphElement;
const postList = document.getElementById("post-list") as HTMLElement;

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
              <span class="poll-option-label">${opt.option}</span>
              <span class="poll-option-pct">${pct}%</span>
            </li>`;
        }).join("");
        return `
        <div class="post-wrapper hidden" data-question="${post.question ?? ""}" data-created-by="${post.created_by ?? ""}">
          <a class="poll-card" href="/poll?id=${post.id}">
            <p class="poll-question">${post.question}</p>
            <ul class="poll-options">${options}</ul>
            <span class="poll-meta">${totalVotes} vote${totalVotes !== 1 ? "s" : ""}</span>
          </a>
        </div>`;
      },
    )
    .join("");
}
const postWrapper = postList.querySelectorAll<HTMLElement>(".post-wrapper");

input.addEventListener("input", () => {
  const query = input.value.toLowerCase();

  if (query === "") {
    postWrapper.forEach((w) => w.classList.add("hidden"));
    noResults.classList.add("hidden");
    searchHint.classList.remove("hidden");
    return;
  }

  searchHint.classList.add("hidden");

  let foundAny = false;

  postWrapper.forEach((wrapper) => {
    const username = wrapper.dataset.createdBy!.toLowerCase();
    const questions = wrapper.dataset.question!.toLowerCase();
    const matches = username.includes(query) || questions.includes(query);
    wrapper.classList.toggle("hidden", !matches);
    if (matches) foundAny = true;
  });

  noResults.classList.toggle("hidden", foundAny);
});
