import { API } from "../config/api";
import { getCookie } from "../utils/cookies";

const userId = getCookie("userId");
if (!userId) window.location.replace("/login");

const form = document.getElementById("create-form") as HTMLFormElement;
const optionsList = document.getElementById("options-list") as HTMLUListElement;
const addBtn = document.getElementById("add-option-btn") as HTMLButtonElement;
const removeBtn = document.getElementById("remove-option-btn") as HTMLButtonElement;
const errorMsg = document.getElementById("create-error") as HTMLParagraphElement;

addBtn.addEventListener("click", () => {
  const count = optionsList.children.length;

  const li = document.createElement("li");
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = `option ${count + 1}`;
  input.required = true;
  li.append(input);
  optionsList.append(li);
});

removeBtn.addEventListener("click", () => {
  if (optionsList.children.length > 2) {
    optionsList.lastElementChild?.remove();
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorMsg.textContent = "";

  const question = (document.getElementById("question") as HTMLInputElement).value.trim();
  const options = Array.from(optionsList.querySelectorAll<HTMLInputElement>("input"))
    .map((i) => i.value.trim())
    .filter(Boolean);

  if (options.length < 2) {
    errorMsg.textContent = "at least 2 options required.";
    return;
  }

  // auslagern
  const res = await fetch(API.polls.create, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userId}`,
    },
    body: JSON.stringify({ question, options }),
  });

  if (res.ok) {
    window.location.replace("/start");
  } else {
    const body = await res.json().catch(() => null);
    errorMsg.textContent = body?.detail ?? "failed to create poll.";
  }
});
