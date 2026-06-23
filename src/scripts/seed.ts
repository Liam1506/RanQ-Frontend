import { API } from "../config/api";
import { getCookie } from "../utils/cookies";

/**
 * Dev-only seed script. Wired into admin.astro behind `import.meta.env.DEV`.
 *
 * Uses the currently-logged-in admin (userId cookie) as the bearer token for
 * every call. Skips user registration entirely — the backend's register route
 * relies on Resend for verification emails, which isn't usable in local dev.
 *
 * Creates: 10 polls, 10 posts, 10 quotes, 10 votes, 10 upvotes, 10 downvotes,
 * 10 comments. Failures are surfaced per-call but never abort the run.
 */

const btn = document.getElementById("seed-btn") as HTMLButtonElement | null;
const out = document.getElementById("seed-result") as HTMLParagraphElement | null;
if (!btn || !out) {
  throw new Error("seed.ts loaded but #seed-btn / #seed-result missing");
}

const POLLS: { question: string; options: string[] }[] = [
  { question: "best pizza topping?", options: ["margherita", "pepperoni", "hawaiian", "veggie"] },
  { question: "favorite season?", options: ["spring", "summer", "autumn", "winter"] },
  { question: "ide of choice?", options: ["vscode", "neovim", "intellij", "emacs"] },
  { question: "tabs or spaces?", options: ["tabs", "spaces"] },
  { question: "early bird or night owl?", options: ["early bird", "night owl", "both"] },
  { question: "preferred frontend framework?", options: ["react", "vue", "svelte", "astro", "vanilla"] },
  { question: "coffee or tea?", options: ["coffee", "tea", "neither"] },
  { question: "best programming paradigm?", options: ["oop", "functional", "procedural", "mixed"] },
  { question: "favorite git workflow?", options: ["rebase", "merge", "squash", "trunk-based"] },
  { question: "preferred OS for dev?", options: ["macOS", "linux", "windows", "wsl"] },
];

const POSTS: { question: string; body: string }[] = [
  { question: "first day at uni", body: "rolled in at 8am, regretted my life choices immediately. lectures were dense but the cafeteria coffee saved me." },
  { question: "deployed on a friday", body: "told myself never again. did it again. survived. somehow." },
  { question: "rubber duck saved me", body: "spent 3 hours debugging a typo in a config file. explained it to my rubber duck and instantly spotted it." },
  { question: "the great refactor", body: "rewrote the entire auth flow over the weekend. now nothing works but the code is beautiful." },
  { question: "css grid changed my life", body: "after years of float-based layouts, discovering css grid felt like seeing color for the first time." },
  { question: "merge conflict horror story", body: "1000+ files. three teams. one shared feature branch. we did not survive." },
  { question: "the docs were lying", body: "the example in the docs has been broken since 2019. github issue #847 is still open. send help." },
  { question: "vim vs vscode again", body: "switched back to vscode after a month of vim. peace at last. my pinky finger is thankful." },
  { question: "why is npm install slow", body: "1700 transitive dependencies for a hello world. node_modules weighs more than my laptop." },
  { question: "production fire on a sunday", body: "got paged at 3am. it was a cron job no one knew existed. fixed it. went back to sleep. never spoke of it again." },
];

const QUOTES: { question: string; body: string }[] = [
  { question: "Web Engineering", body: `"premature optimization is the root of all evil"\n— donald knuth, 1974` },
  { question: "Algorithmen", body: `"there are only two hard things in computer science: cache invalidation and naming things"\n— phil karlton` },
  { question: "Software Engineering", body: `"any fool can write code that a computer can understand. good programmers write code that humans can understand"\n— martin fowler` },
  { question: "Datenbanken", body: `"the most damaging phrase in language is 'we've always done it this way'"\n— grace hopper` },
  { question: "Mathematik 2", body: `"weeks of programming can save you hours of planning"\n— anonymous` },
  { question: "Theoretische Informatik", body: `"simplicity is prerequisite for reliability"\n— edsger dijkstra` },
  { question: "Web Engineering", body: `"talk is cheap. show me the code"\n— linus torvalds` },
  { question: "Programmieren 1", body: `"controlling complexity is the essence of computer programming"\n— brian kernighan` },
  { question: "Compilerbau", body: `"make it work, make it right, make it fast"\n— kent beck` },
  { question: "Web Engineering", body: `"the best error message is the one that never shows up"\n— thomas fuchs` },
];

const COMMENTS = [
  "great post, thanks for sharing!",
  "totally agree with this take.",
  "interesting perspective — hadn't thought about it that way.",
  "this matches my experience exactly.",
  "controversial but i kinda see your point.",
  "nice writeup, saved for later.",
  "lmao the rubber duck part 😂",
  "would love a follow-up on this.",
  "this aged poorly — or maybe perfectly.",
  "thanks, very informative!",
];

type Created = { id: string; firstOptionId?: string };

function log(line: string) {
  out!.textContent = (out!.textContent ?? "") + line + "\n";
}

function reset() {
  out!.textContent = "";
}

async function createContent(
  token: string,
  payload: Record<string, unknown>,
): Promise<Created | null> {
  const res = await fetch(API.polls.create, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("create failed", { status: res.status, payload, body });
    return null;
  }
  const body = await res.json().catch(() => null);
  if (!body?.id) return null;
  const firstOptionId = Array.isArray(body.options) && body.options.length > 0
    ? body.options[0].id
    : undefined;
  return { id: body.id, firstOptionId };
}

async function vote(token: string, pollId: string, optionId: string): Promise<boolean> {
  const res = await fetch(API.polls.vote, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ poll_id: pollId, option_id: optionId }),
  });
  return res.ok;
}

async function redditVote(token: string, pollId: string, direction: 1 | -1): Promise<boolean> {
  const res = await fetch(API.polls.redditVote, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ poll_id: pollId, voting_score: direction }),
  });
  return res.ok;
}

async function comment(token: string, pollId: string, text: string): Promise<boolean> {
  const res = await fetch(API.polls.comment, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ poll_id: pollId, comment: text }),
  });
  return res.ok;
}

async function run() {
  btn!.disabled = true;
  reset();

  const token = getCookie("userId");
  if (!token) {
    log("not logged in — can't seed.");
    btn!.disabled = false;
    return;
  }

  log("seeding...");

  // 1. Content — all authored by the current admin
  const polls: Created[] = [];
  const posts: Created[] = [];
  const quotes: Created[] = [];

  for (let i = 0; i < 10; i++) {
    const p = POLLS[i];
    const r = await createContent(token, { kind: "ranking", question: p.question, options: p.options });
    if (r) polls.push(r);
  }
  log(`polls: ${polls.length}/10`);

  for (let i = 0; i < 10; i++) {
    const p = POSTS[i];
    const r = await createContent(token, { kind: "post", question: p.question, body: p.body });
    if (r) posts.push(r);
  }
  log(`posts: ${posts.length}/10`);

  for (let i = 0; i < 10; i++) {
    const q = QUOTES[i];
    const r = await createContent(token, { kind: "quote", question: q.question, body: q.body });
    if (r) quotes.push(r);
  }
  log(`quotes: ${quotes.length}/10`);

  // 2. Votes — admin votes on each poll's first option
  let voteOk = 0;
  for (const poll of polls) {
    if (!poll.firstOptionId) continue;
    if (await vote(token, poll.id, poll.firstOptionId)) voteOk++;
  }
  log(`votes: ${voteOk}/${polls.length}`);

  // 3. Up/down votes + 4. Comments — cycled across polls/posts/quotes.
  // Each user can only cast one updown vote per item, so spread across all 30:
  //   - items 0-9   → upvote
  //   - items 10-19 → downvote
  //   - items 0-9   → comment
  const allContent = [...polls, ...posts, ...quotes];
  let upOk = 0;
  let downOk = 0;
  let commentOk = 0;
  for (let i = 0; i < 10; i++) {
    const upTarget = allContent[i];
    const downTarget = allContent[i + 10];
    const commentTarget = allContent[i % allContent.length];
    if (upTarget && (await redditVote(token, upTarget.id, 1))) upOk++;
    if (downTarget && (await redditVote(token, downTarget.id, -1))) downOk++;
    if (commentTarget && (await comment(token, commentTarget.id, COMMENTS[i]))) commentOk++;
  }
  log(`upvotes: ${upOk}/10`);
  log(`downvotes: ${downOk}/10`);
  log(`comments: ${commentOk}/10`);
  log("done.");
  btn!.disabled = false;
}

btn.addEventListener("click", () => {
  run().catch((err) => {
    log(`fatal: ${err instanceof Error ? err.message : String(err)}`);
    btn!.disabled = false;
  });
});
