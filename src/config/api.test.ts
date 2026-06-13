import { describe, expect, it } from "vitest";
import { API } from "./api";

describe("API config", () => {
  it("uses the configured base URL", () => {
    expect(API.auth.login.startsWith("http://localhost:5001")).toBe(true);
  });

  it("defines all auth endpoints under /api/auth/", () => {
    expect(API.auth.login).toBe("http://localhost:5001/api/auth/login");
    expect(API.auth.register).toBe("http://localhost:5001/api/auth/register");
    expect(API.auth.logout).toBe("http://localhost:5001/api/auth/logout");
    expect(API.auth.verify).toBe("http://localhost:5001/api/auth/verify");
    expect(API.auth.status).toBe("http://localhost:5001/api/auth/status");
    expect(API.auth.devLogin).toBe("http://localhost:5001/api/auth/dev-login");
  });

  it("defines all polls endpoints under /api/polls/", () => {
    for (const url of Object.values(API.polls)) {
      expect(url).toMatch(/^http:\/\/localhost:5001\/api\/polls\//);
    }
  });

  it("includes the endpoints the frontend actually calls", () => {
    // Sanity: make sure no key was accidentally renamed.
    const required = [
      "getAll", "getMyPolls", "getUnapproved",
      "create", "delete", "vote", "comment",
      "getAllComments", "redditVote", "approvePoll",
    ] as const;
    for (const key of required) {
      expect(API.polls[key]).toBeDefined();
    }
  });
});
