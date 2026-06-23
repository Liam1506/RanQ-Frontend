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

function setupLoginDom() {
  document.body.innerHTML = `
    <form id="login-form">
      <input id="identifier" type="text" value="" />
      <input id="password" type="password" value="" />
      <button id="submit-btn">→</button>
      <p id="login-error"></p>
    </form>
  `;
}

describe("login", () => {
  let replaceSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clearAllCookies();
    setupLoginDom();
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

  it("sets cookies and redirects to / on successful login", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({ token: "jwt-abc", user: { admin: false, owner: false } }),
        { status: 200 }
      )
    );

    await import("./login");

    (document.getElementById("identifier") as HTMLInputElement).value = "alice";
    (document.getElementById("password") as HTMLInputElement).value = "secret";

    const form = document.getElementById("login-form") as HTMLFormElement;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await new Promise((r) => setTimeout(r, 0));

    expect(getCookie("userId")).toBe("jwt-abc");
    expect(getCookie("verified")).toBe("true");
    expect(getCookie("isAdmin")).toBe("false");
    expect(getCookie("isOwner")).toBe("false");
    expect(replaceSpy).toHaveBeenCalledWith("/");
  });

  it("redirects to /verify when server returns Unverified detail", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Unverified" }), { status: 401 })
    );

    await import("./login");

    (document.getElementById("identifier") as HTMLInputElement).value = "alice";
    (document.getElementById("password") as HTMLInputElement).value = "secret";

    document.getElementById("login-form")!.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );
    await new Promise((r) => setTimeout(r, 0));

    expect(replaceSpy).toHaveBeenCalledWith("/verify");
  });

  it("shows error message when credentials are wrong", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Invalid credentials" }), { status: 401 })
    );

    await import("./login");

    document.getElementById("login-form")!.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );
    await new Promise((r) => setTimeout(r, 0));

    const error = document.getElementById("login-error") as HTMLParagraphElement;
    expect(error.textContent).toBe("Invalid credentials");
    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it("shows generic error when error response has no detail", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 400 })
    );

    await import("./login");

    document.getElementById("login-form")!.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );
    await new Promise((r) => setTimeout(r, 0));

    const error = document.getElementById("login-error") as HTMLParagraphElement;
    expect(error.textContent).toBe("login failed.");
  });

  it("shows network error when fetch rejects", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("network down"));

    await import("./login");

    document.getElementById("login-form")!.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );
    await new Promise((r) => setTimeout(r, 0));

    const error = document.getElementById("login-error") as HTMLParagraphElement;
    expect(error.textContent).toBe("network error — please try again.");
  });

  it("disables the submit button while loading", async () => {
    let resolveFetch!: (v: Response) => void;
    vi.spyOn(globalThis, "fetch").mockReturnValueOnce(
      new Promise((resolve) => { resolveFetch = resolve; })
    );

    await import("./login");

    const btn = document.getElementById("submit-btn") as HTMLButtonElement;
    document.getElementById("login-form")!.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    expect(btn.disabled).toBe(true);

    resolveFetch(new Response(JSON.stringify({ token: "t", user: { admin: false, owner: false } }), { status: 200 }));
    await new Promise((r) => setTimeout(r, 0));
  });
});
