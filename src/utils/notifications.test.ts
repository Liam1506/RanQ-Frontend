import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setCookie } from "./cookies";

// Notifications module is side-effectful at import time (reads cookie, checks
// Notification API).  We import the named export after setting up the
// environment for each test.

function clearAllCookies() {
  document.cookie.split("; ").forEach((c) => {
    const name = c.split("=")[0];
    if (name) document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  });
}

// Helper to build a mock Notification constructor + permission property.
function mockNotification(permission: NotificationPermission) {
  const NotificationMock = vi.fn();
  Object.defineProperty(NotificationMock, "permission", { value: permission, configurable: true });
  Object.defineProperty(NotificationMock, "requestPermission", {
    value: vi.fn().mockResolvedValue(permission),
    configurable: true,
  });
  return NotificationMock;
}

describe("startNotificationPolling", () => {
  beforeEach(() => {
    clearAllCookies();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    clearAllCookies();
  });

  it("does nothing when the userId cookie is absent", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    Object.defineProperty(globalThis, "Notification", {
      value: mockNotification("granted"),
      configurable: true,
    });

    const { startNotificationPolling } = await import("../scripts/notifications");
    startNotificationPolling();

    // advance past the poll interval to confirm no fetch was triggered
    await vi.advanceTimersByTimeAsync(20000);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does nothing when Notification permission is not granted", async () => {
    setCookie("userId", "test-token");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    Object.defineProperty(globalThis, "Notification", {
      value: mockNotification("default"),
      configurable: true,
    });

    const { startNotificationPolling } = await import("../scripts/notifications");
    startNotificationPolling();

    await vi.advanceTimersByTimeAsync(20000);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("calls fetch with Authorization header when conditions are met", async () => {
    setCookie("userId", "my-jwt-token");
    Object.defineProperty(globalThis, "Notification", {
      value: mockNotification("granted"),
      configurable: true,
    });

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 })
    );

    const { startNotificationPolling } = await import("../scripts/notifications");
    startNotificationPolling();

    // The immediate pollNotifications() call is async — flush it without
    // advancing into the repeating interval (15 000 ms).
    await vi.advanceTimersByTimeAsync(0);

    expect(fetchSpy).toHaveBeenCalled();
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    // Normalize init.headers (which may be a Headers instance, plain object, or
    // tuple array depending on how the caller built the request) into a Headers
    // we can read uniformly.
    const headers = new Headers((init.headers ?? {}) as HeadersInit);
    expect(headers.get("Authorization")).toBe("Bearer my-jwt-token");
  });

  it("shows a Notification for each item returned by the API", async () => {
    setCookie("userId", "my-jwt-token");
    const NotifMock = mockNotification("granted");
    Object.defineProperty(globalThis, "Notification", {
      value: NotifMock,
      configurable: true,
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify([
          { title: "New vote", body: "Someone voted on your poll" },
          { title: "New comment", body: "Someone commented" },
        ]),
        { status: 200 }
      )
    );

    const { startNotificationPolling } = await import("../scripts/notifications");
    startNotificationPolling();

    // Flush the immediate async poll without triggering the repeating interval.
    await vi.advanceTimersByTimeAsync(0);

    expect(NotifMock).toHaveBeenCalledTimes(2);
    expect(NotifMock).toHaveBeenCalledWith("New vote", expect.objectContaining({ body: "Someone voted on your poll" }));
    expect(NotifMock).toHaveBeenCalledWith("New comment", expect.objectContaining({ body: "Someone commented" }));
  });

  it("does not throw when the API returns a non-OK response", async () => {
    setCookie("userId", "my-jwt-token");
    Object.defineProperty(globalThis, "Notification", {
      value: mockNotification("granted"),
      configurable: true,
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 500 })
    );

    const { startNotificationPolling } = await import("../scripts/notifications");
    await expect(async () => {
      startNotificationPolling();
      await vi.advanceTimersByTimeAsync(0);
    }).not.toThrow();
  });

  it("does not throw when fetch rejects (network error)", async () => {
    setCookie("userId", "my-jwt-token");
    Object.defineProperty(globalThis, "Notification", {
      value: mockNotification("granted"),
      configurable: true,
    });

    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));

    const { startNotificationPolling } = await import("../scripts/notifications");
    await expect(async () => {
      startNotificationPolling();
      await vi.advanceTimersByTimeAsync(0);
    }).not.toThrow();
  });
});
