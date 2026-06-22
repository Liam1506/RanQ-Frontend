import { API } from "../config/api";
import { setCookie } from "../utils/cookies";

document.querySelectorAll<HTMLAnchorElement>("a.skip").forEach((link) => {
  link.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(API.auth.devLogin, { method: "POST" });
      if (!res.ok) {
        window.location.replace("/start");
        return;
      }
      const { token, user } = await res.json();
      setCookie("userId", token);
      setCookie("verified", "true");
      setCookie("isAdmin", String(user.admin));
      setCookie("isOwner", String(user.owner));
      window.location.replace("/");
    } catch {
      window.location.replace("/start");
    }
  });
});
