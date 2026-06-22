import { describe, expect, it } from "vitest";
import { API } from "./api";

const BASE = "http://localhost:5001";

describe("API config", () => {
  it("uses the configured base URL", () => {
    expect(API.auth.login.startsWith(BASE)).toBe(true);
  });

  it("defines all auth endpoints under /api/auth/", () => {
    expect(API.auth.login).toBe(`${BASE}/api/auth/login`);
    expect(API.auth.register).toBe(`${BASE}/api/auth/register`);
    expect(API.auth.logout).toBe(`${BASE}/api/auth/logout`);
    expect(API.auth.verify).toBe(`${BASE}/api/auth/verify`);
    expect(API.auth.status).toBe(`${BASE}/api/auth/status`);
    expect(API.auth.devLogin).toBe(`${BASE}/api/auth/dev-login`);
  });

  it("defines the profile auth endpoints", () => {
    expect(API.auth.changeUsername).toBe(`${BASE}/api/auth/profile/username`);
    expect(API.auth.changePassword).toBe(`${BASE}/api/auth/profile/password`);
    expect(API.auth.deleteAccount).toBe(`${BASE}/api/auth/profile/delete`);
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

  it("defines all siteSettings endpoints under /api/settings/", () => {
    expect(API.siteSettings.get).toBe(`${BASE}/api/settings/`);
    expect(API.siteSettings.update).toBe(`${BASE}/api/settings/update/`);
    expect(API.siteSettings.cleanup).toBe(`${BASE}/api/settings/cleanup/`);
    expect(API.siteSettings.stats).toBe(`${BASE}/api/settings/stats/`);
  });

  it("defines all users endpoints under /api/auth/users", () => {
    expect(API.users.list).toBe(`${BASE}/api/auth/users`);
    expect(API.users.toggleAdmin).toBe(`${BASE}/api/auth/users/toggle-admin`);
    expect(API.users.toggleVerified).toBe(`${BASE}/api/auth/users/toggle-verified`);
    expect(API.users.delete).toBe(`${BASE}/api/auth/users/delete`);
  });

  it("every URL starts with the base URL", () => {
    function collectUrls(obj: Record<string, unknown>): string[] {
      return Object.values(obj).flatMap((v) =>
        typeof v === "string" ? [v] : collectUrls(v as Record<string, unknown>)
      );
    }
    for (const url of collectUrls(API as unknown as Record<string, unknown>)) {
      expect(url.startsWith(BASE)).toBe(true);
    }
  });
});
