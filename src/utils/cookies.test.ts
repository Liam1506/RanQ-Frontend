import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteCookie, getCookie, setCookie } from "./cookies";

function clearAllCookies() {
  document.cookie.split("; ").forEach((c) => {
    const name = c.split("=")[0];
    if (name) document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  });
}

describe("cookies", () => {
  beforeEach(() => {
    // happy-dom shares document.cookie across tests — clear it
    clearAllCookies();
  });

  it("returns undefined when the cookie is not set", () => {
    expect(getCookie("missing")).toBeUndefined();
  });

  it("round-trips a value through set then get", () => {
    setCookie("userId", "abc-123");
    expect(getCookie("userId")).toBe("abc-123");
  });

  it("handles multiple cookies independently", () => {
    setCookie("userId", "abc");
    setCookie("verified", "true");
    expect(getCookie("userId")).toBe("abc");
    expect(getCookie("verified")).toBe("true");
  });

  it("deleteCookie removes the value", () => {
    setCookie("userId", "abc");
    deleteCookie("userId");
    expect(getCookie("userId")).toBeUndefined();
  });

  it("does not match cookies whose name is a prefix of another", () => {
    setCookie("user", "short");
    setCookie("userId", "long");
    expect(getCookie("user")).toBe("short");
    expect(getCookie("userId")).toBe("long");
  });

  it("setCookie accepts a custom days argument", () => {
    const spy = vi.spyOn(document, "cookie", "set");
    setCookie("tok", "xyz", 7);
    const written = spy.mock.calls[0][0] as string;
    // 7 days = 604800 seconds
    expect(written).toContain("max-age=604800");
    spy.mockRestore();
  });

  it("setCookie defaults to 30 days when days is omitted", () => {
    const spy = vi.spyOn(document, "cookie", "set");
    setCookie("tok", "xyz");
    const written = spy.mock.calls[0][0] as string;
    // 30 days = 2592000 seconds
    expect(written).toContain("max-age=2592000");
    spy.mockRestore();
  });

  it("deleteCookie on an absent key does not throw", () => {
    expect(() => deleteCookie("nonexistent")).not.toThrow();
  });

  it("overwrites an existing cookie value", () => {
    setCookie("theme", "dark");
    setCookie("theme", "light");
    expect(getCookie("theme")).toBe("light");
  });
});
