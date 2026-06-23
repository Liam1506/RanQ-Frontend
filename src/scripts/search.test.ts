import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function clearAllCookies() {
  document.cookie.split("; ").forEach((c) => {
    const name = c.split("=")[0];
    if (name) document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  });
}

function setupSearchDom() {
  document.body.innerHTML = `
    <input id="search-input" type="text" value="" />
    <p id="no-results" class="hidden"></p>
    <div id="post-list"></div>
    <div id="search-sentinel"></div>
  `;
}

type SearchPoll = {
  id: string;
  kind: "ranking" | "post" | "quote";
  question: string;
  body?: string;
  creator_username: string | null;
  created_at: string | null;
  voted_option_id: string | null;
  total_up_down_score: number;
  comment_count: number;
  options: Array<{ id: string; option: string; votes: number }>;
};

const BASE_RANKING_POLL: SearchPoll = {
  id: "poll-1",
  kind: "ranking",
  question: "Best color?",
  creator_username: "alice",
  created_at: "2024-06-15T10:00:00Z",
  voted_option_id: null,
  total_up_down_score: 5,
  comment_count: 2,
  options: [
    { id: "opt-1", option: "Red", votes: 10 },
    { id: "opt-2", option: "Blue", votes: 5 },
  ],
};

const BASE_POST_POLL: SearchPoll = {
  id: "poll-2",
  kind: "post",
  question: "My Post Title",
  body: "This is the post body",
  creator_username: "bob",
  created_at: "2024-01-01T00:00:00Z",
  voted_option_id: null,
  total_up_down_score: 3,
  comment_count: 1,
  options: [],
};

const BASE_QUOTE_POLL: SearchPoll = {
  id: "poll-3",
  kind: "quote",
  question: "Web Engineering",
  body: "A quote from the lecture",
  creator_username: "carol",
  created_at: "2024-03-01T00:00:00Z",
  voted_option_id: null,
  total_up_down_score: 0,
  comment_count: 0,
  options: [],
};

async function loadSearchModule(polls: SearchPoll[], hasMore = false) {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ polls, has_more: hasMore }), { status: 200 })
  );
  await import("./search");
  await new Promise((r) => setTimeout(r, 10));
}

describe("search renderCard", () => {
  beforeEach(() => {
    clearAllCookies();
    document.cookie = "userId=test-token; path=/";
    setupSearchDom();
    Object.defineProperty(window, "location", {
      value: { replace: vi.fn() },
      configurable: true,
      writable: true,
    });
    vi.spyOn(IntersectionObserver.prototype, "observe").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    clearAllCookies();
  });

  it("renders a link to the poll detail page", async () => {
    await loadSearchModule([BASE_RANKING_POLL]);
    const link = document.querySelector<HTMLAnchorElement>(`a[href="/poll?id=poll-1"]`);
    expect(link).not.toBeNull();
  });

  it("renders the poll question escaped", async () => {
    const xssPoll = { ...BASE_RANKING_POLL, question: '<script>alert(1)</script>' };
    await loadSearchModule([xssPoll]);
    const html = document.getElementById("post-list")!.innerHTML;
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("renders ranking options with percentage bars", async () => {
    await loadSearchModule([BASE_RANKING_POLL]);
    const bars = document.querySelectorAll(".poll-option-bar");
    expect(bars.length).toBeGreaterThan(0);
    const pcts = document.querySelectorAll(".poll-option-pct");
    expect(pcts.length).toBeGreaterThan(0);
  });

  it("renders the voted option with poll-option--voted class", async () => {
    const votedPoll = { ...BASE_RANKING_POLL, voted_option_id: "opt-1" };
    await loadSearchModule([votedPoll]);
    const voted = document.querySelector(".poll-option--voted");
    expect(voted).not.toBeNull();
    expect(voted!.querySelector(".poll-option-label")!.textContent).toBe("Red");
  });

  it("renders overflow indicator when there are more than 3 options", async () => {
    const manyOptions = {
      ...BASE_RANKING_POLL,
      options: [
        { id: "1", option: "A", votes: 5 },
        { id: "2", option: "B", votes: 4 },
        { id: "3", option: "C", votes: 3 },
        { id: "4", option: "D", votes: 2 },
        { id: "5", option: "E", votes: 1 },
      ],
    };
    await loadSearchModule([manyOptions]);
    const overflow = document.querySelector(".poll-option-overflow");
    expect(overflow).not.toBeNull();
    expect(overflow!.textContent).toContain("2 more");
  });

  it("renders post body text (not options)", async () => {
    await loadSearchModule([BASE_POST_POLL]);
    const body = document.querySelector(".poll-body");
    expect(body).not.toBeNull();
    expect(body!.textContent).toContain("This is the post body");
    expect(document.querySelector(".poll-options")).toBeNull();
  });

  it("truncates long post body with ellipsis", async () => {
    const longPost = { ...BASE_POST_POLL, body: "x".repeat(300) };
    await loadSearchModule([longPost]);
    const body = document.querySelector(".poll-body");
    expect(body!.textContent).toContain("…");
    expect(body!.textContent!.length).toBeLessThan(300);
  });

  it("renders quote body with poll-body--quote class", async () => {
    await loadSearchModule([BASE_QUOTE_POLL]);
    const body = document.querySelector(".poll-body--quote");
    expect(body).not.toBeNull();
    expect(body!.textContent).toContain("A quote from the lecture");
  });

  it("renders author username in the footer", async () => {
    await loadSearchModule([BASE_RANKING_POLL]);
    const footer = document.querySelector(".poll-meta-author");
    expect(footer!.textContent).toBe("@alice");
  });

  it("renders empty author when creator_username is null", async () => {
    const anonPoll = { ...BASE_RANKING_POLL, creator_username: null };
    await loadSearchModule([anonPoll]);
    const footer = document.querySelector(".poll-meta-author");
    expect(footer!.textContent).toBe("");
  });

  it("shows no-results when API returns empty array", async () => {
    await loadSearchModule([]);
    const noResults = document.getElementById("no-results");
    expect(noResults!.classList.contains("hidden")).toBe(false);
  });

  it("renders poll card with poll-card--post class for post kind", async () => {
    await loadSearchModule([BASE_POST_POLL]);
    const card = document.querySelector(".poll-card--post");
    expect(card).not.toBeNull();
  });

  it("renders poll card with poll-card--quote class for quote kind", async () => {
    await loadSearchModule([BASE_QUOTE_POLL]);
    const card = document.querySelector(".poll-card--quote");
    expect(card).not.toBeNull();
  });

  it("renders comment count in footer", async () => {
    await loadSearchModule([BASE_RANKING_POLL]);
    const meta = document.querySelector(".poll-meta");
    expect(meta!.textContent).toContain("2 comments");
  });

  it("uses singular 'comment' when count is 1", async () => {
    const poll = { ...BASE_RANKING_POLL, comment_count: 1 };
    await loadSearchModule([poll]);
    const meta = document.querySelector(".poll-meta");
    expect(meta!.textContent).toContain("1 comment");
    expect(meta!.textContent).not.toContain("1 comments");
  });

  it("escapes option text to prevent XSS", async () => {
    const xssPoll = {
      ...BASE_RANKING_POLL,
      options: [
        { id: "1", option: '<img src=x onerror=alert(1)>', votes: 10 },
        { id: "2", option: "Safe", votes: 5 },
      ],
    };
    await loadSearchModule([xssPoll]);
    const html = document.getElementById("post-list")!.innerHTML;
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
});
