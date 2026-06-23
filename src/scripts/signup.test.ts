import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function clearAllCookies() {
  document.cookie.split("; ").forEach((c) => {
    const name = c.split("=")[0];
    if (name) document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  });
}

function getCookie(name: string): string | undefined {
  return document.cookie.split("; ").find((c) => c.startsWith(`${name}=`))?.split("=")[1];
}

function setupSignupDom() {
  document.body.innerHTML = `
    <form id="signup-form">
      <input id="email" type="email" value="" />
      <input id="username" type="text" value="" />
      <input id="password" type="password" value="" />
      <p id="signup-error"></p>
    </form>
  `;
}

describe("signup", () => {
  let replaceSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clearAllCookies();
    setupSignupDom();
    replaceSpy = vi.fn();
    Object.defineProperty(window, "location", {
      value: { replace: replaceSpy },
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "Notification", {
      value: { permission: "denied", requestPermission: vi.fn() },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    clearAllCookies();
  });

  it("sets cookies and redirects to /verify on success", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "user-token-xyz" }), { status: 200 })
    );

    await import("./signup");

    (document.getElementById("email") as HTMLInputElement).value = "alice@example.com";
    (document.getElementById("username") as HTMLInputElement).value = "alice";
    (document.getElementById("password") as HTMLInputElement).value = "password123";

    document.getElementById("signup-form")!.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );
    await new Promise((r) => setTimeout(r, 0));

    expect(getCookie("userId")).toBe("user-token-xyz");
    expect(getCookie("verified")).toBe("false");
    expect(replaceSpy).toHaveBeenCalledWith("/verify");
  });

  it("shows detail error message from server", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Username already taken" }), { status: 400 })
    );

    await import("./signup");

    document.getElementById("signup-form")!.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );
    await new Promise((r) => setTimeout(r, 0));

    const error = document.getElementById("signup-error") as HTMLParagraphElement;
    expect(error.textContent).toBe("Username already taken");
    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it("shows first field error when server returns field-level validation errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({ email: ["Enter a valid email address."] }),
        { status: 400 }
      )
    );

    await import("./signup");

    document.getElementById("signup-form")!.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );
    await new Promise((r) => setTimeout(r, 0));

    const error = document.getElementById("signup-error") as HTMLParagraphElement;
    expect(error.textContent).toBe("Enter a valid email address.");
  });

  it("shows fallback message when error body is null", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(null, { status: 500 })
    );

    await import("./signup");

    document.getElementById("signup-form")!.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );
    await new Promise((r) => setTimeout(r, 0));

    const error = document.getElementById("signup-error") as HTMLParagraphElement;
    expect(error.textContent).toBe("registration failed.");
  });

  it("sends email, username, and password in the request body", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "tok" }), { status: 200 })
    );

    await import("./signup");

    (document.getElementById("email") as HTMLInputElement).value = "bob@example.com";
    (document.getElementById("username") as HTMLInputElement).value = "bob";
    (document.getElementById("password") as HTMLInputElement).value = "hunter2";

    document.getElementById("signup-form")!.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );
    await new Promise((r) => setTimeout(r, 0));

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({ email: "bob@example.com", username: "bob", password: "hunter2" });
  });
});
