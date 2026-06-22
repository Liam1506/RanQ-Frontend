import { API } from "../config/api";
import { setCookie } from "../utils/cookies";

const form = document.getElementById("login-form") as HTMLFormElement;
const btn = document.getElementById("submit-btn") as HTMLButtonElement;
const errorMsg = document.getElementById("login-error") as HTMLParagraphElement;

function showError(message: string) {
  errorMsg.textContent = message;
}

function setLoading(loading: boolean) {
  btn.disabled = loading;
  btn.classList.toggle("btn--loading", loading);
  btn.textContent = loading ? "" : "→";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const identifier = (document.getElementById("identifier") as HTMLInputElement).value;
  const password = (document.getElementById("password") as HTMLInputElement).value;

  setLoading(true);

  try {
    const response = await fetch(API.auth.login, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: identifier, password }),
    });

    if (response.ok) {
      const { token, user } = await response.json();
      setCookie("userId", token);
      setCookie("verified", "true");
      setCookie("isAdmin", String(user.admin));
      setCookie("isOwner", String(user.owner));
      if ("Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission();
      }

      window.location.replace("/");
    } else {
      const body = await response.json().catch(() => null);
      if (body?.detail === "Unverified") {
        window.location.replace("/verify");
      } else {
        showError(body?.detail ?? "login failed.");
        setLoading(false);
      }
    }
  } catch {
    showError("network error — please try again.");
    setLoading(false);
  }
});
