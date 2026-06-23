import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function clearAllCookies() {
  document.cookie.split("; ").forEach((c) => {
    const name = c.split("=")[0];
    if (name) document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  });
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/`;
}

describe("router", () => {
  let replaceSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clearAllCookies();
    replaceSpy = vi.fn();
    Object.defineProperty(window, "location", {
      value: { replace: replaceSpy },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.resetModules();
    clearAllCookies();
  });

  it("redirects to /start when userId and verified=true are set", async () => {
    setCookie("userId", "abc");
    setCookie("verified", "true");
    await import("./router");
    expect(replaceSpy).toHaveBeenCalledWith("/start");
  });

  it("redirects to /verify when userId is set but verified=false", async () => {
    setCookie("userId", "abc");
    setCookie("verified", "false");
    await import("./router");
    expect(replaceSpy).toHaveBeenCalledWith("/verify");
  });

  it("redirects to /login when no userId cookie is present", async () => {
    await import("./router");
    expect(replaceSpy).toHaveBeenCalledWith("/login");
  });

  it("redirects to /login when userId is set but verified cookie is absent", async () => {
    setCookie("userId", "abc");
    await import("./router");
    expect(replaceSpy).toHaveBeenCalledWith("/login");
  });
});
