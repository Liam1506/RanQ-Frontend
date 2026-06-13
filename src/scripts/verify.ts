import { API } from "../config/api";
import { getCookie, setCookie } from "../utils/cookies";

const token = new URLSearchParams(window.location.search).get("token");

if (token) {
  fetch(API.auth.verify, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ verifyId: token }),
  }).then((res) => {
    if (res.ok) {
      setCookie("verified", "true");
      window.location.replace("/login");
    } else {
      window.location.replace("/verify?error=invalid");
    }
  });
}

const btn = document.getElementById("reload-btn") as HTMLButtonElement;
if (btn) {
  btn.addEventListener("click", async () => {
    const userId = getCookie("userId");
    if (!userId) {
      window.location.replace("/login");
      return;
    }

    const res = await fetch(`${API.auth.status}?userId=${userId}`);
    if (res.ok) {
      const { verified } = await res.json();
      setCookie("verified", String(verified));
      window.location.replace(verified ? "/" : "/verify");
    } else {
      window.location.replace("/login");
    }
  });
}
