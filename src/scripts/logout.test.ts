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

function getCookie(name: string): string | undefined {
  return document.cookie.split("; ").find((c) => c.startsWith(`${name}=`))?.split("=")[1];
}

describe("logout", () => {
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

  it("redirects to /login", async () => {
    await import("./logout");
    expect(replaceSpy).toHaveBeenCalledWith("/login");
  });

  it("clears the userId cookie", async () => {
    setCookie("userId", "abc");
    await import("./logout");
    expect(getCookie("userId")).toBeUndefined();
  });

  it("clears the verified cookie", async () => {
    setCookie("verified", "true");
    await import("./logout");
    expect(getCookie("verified")).toBeUndefined();
  });

  it("clears the isAdmin cookie", async () => {
    setCookie("isAdmin", "true");
    await import("./logout");
    expect(getCookie("isAdmin")).toBeUndefined();
  });

  it("clears the isOwner cookie", async () => {
    setCookie("isOwner", "true");
    await import("./logout");
    expect(getCookie("isOwner")).toBeUndefined();
  });
});
