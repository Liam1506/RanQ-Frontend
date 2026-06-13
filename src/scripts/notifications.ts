import { getCookie } from "../utils/cookies";

const POLL_INTERVAL = 15000;
let pollingInterval: ReturnType<typeof setInterval> | null = null;

async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  const permission = await Notification.requestPermission();
  return permission === "granted";
}

function showNotification(title: string, body: string) {
  new Notification(title, { body, icon: "/favicon.ico" });
}

async function pollNotifications() {
  const token = getCookie("userId");
  if (!token) return;

  try {
    const res = await fetch(`${import.meta.env.PUBLIC_API_BASE_URL}/api/notifications/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const notifications = await res.json();
    notifications.forEach((n: { title: string; body: string }) => {
      showNotification(n.title, n.body);
    });
  } catch {
    // silently fail, just ignore, notifications aren't that important, are they :)
  }
}

export function startNotificationPolling() {
  const token = getCookie("userId");
  if (!token) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  if (pollingInterval) clearInterval(pollingInterval);

  pollNotifications();
  pollingInterval = setInterval(pollNotifications, POLL_INTERVAL);
}
