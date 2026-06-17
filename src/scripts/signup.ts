import { API } from "../config/api";
import { setCookie } from "../utils/cookies";

const form = document.getElementById("signup-form") as HTMLFormElement;
const errorMsg = document.getElementById("signup-error") as HTMLParagraphElement;

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = (document.getElementById("email") as HTMLInputElement).value;
  const username = (document.getElementById("username") as HTMLInputElement).value;
  const password = (document.getElementById("password") as HTMLInputElement).value;

  const response = await fetch(API.auth.register, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, username, password }),
  });

  if (response.ok) {
    const user = await response.json();
    setCookie("userId", user.id);
    setCookie("verified", "false");
    window.location.replace("/verify");
  } else {
    const body = await response.json().catch(() => null);
    if (body?.detail) {
      errorMsg.textContent = body.detail;
    } else if (body) {
      const first = Object.values(body).flat()[0];
      errorMsg.textContent = typeof first === "string" ? first : "registration failed.";
    } else {
      errorMsg.textContent = "registration failed.";
    }
  }
});
