import { API } from "../config/api";
import { getCookie } from "../utils/cookies";
import { authedFetch } from "../utils/api-client";

const POLL_INTERVAL = 15_000;
let pollingInterval: ReturnType<typeof setInterval> | null = null;

async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  return (await Notification.requestPermission()) === "granted";
}

function showNotification(title: string, body: string) {
  new Notification(title, { body, icon: "/favicon.ico" });
}

async function pollNotifications() {
  const token = getCookie("userId");
  if (!token) return;
  try {
    const res = await authedFetch(API.notifications.list);
    if (!res.ok) return;
    const notifications: Array<{ title: string; body: string }> = await res.json();
    notifications.forEach((n) => showNotification(n.title, n.body));
  } catch {
    // network failure — silent, notifications are best-effort
  }
}

export async function startNotificationPolling() {
  const token = getCookie("userId");
  if (!token) return;
  const granted = await requestNotificationPermission();
  if (!granted) return;
  if (pollingInterval) clearInterval(pollingInterval);
  pollNotifications();
  pollingInterval = setInterval(pollNotifications, POLL_INTERVAL);
}
