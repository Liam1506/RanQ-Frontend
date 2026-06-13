import { beforeEach, describe, expect, it } from "vitest";
import { deleteCookie, getCookie, setCookie } from "./cookies";

describe("cookies", () => {
  beforeEach(() => {
    // happy-dom shares document.cookie across tests — clear it
    document.cookie.split("; ").forEach((c) => {
      const name = c.split("=")[0];
      if (name) document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    });
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
});
