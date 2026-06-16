import { API } from "../config/api";
import { getCookie } from "../utils/cookies";

const userId = getCookie("userId");
if (!userId) window.location.replace("/login");

type Kind = "ranking" | "post";

const form = document.getElementById("create-form") as HTMLFormElement;
const optionsList = document.getElementById("options-list") as HTMLUListElement;
const addBtn = document.getElementById("add-option-btn") as HTMLButtonElement;
const removeBtn = document.getElementById("remove-option-btn") as HTMLButtonElement;
const errorMsg = document.getElementById("create-error") as HTMLParagraphElement;
const questionInput = document.getElementById("question") as HTMLInputElement;
const questionLabel = document.getElementById("question-label") as HTMLLabelElement;
const bodyInput = document.getElementById("body") as HTMLTextAreaElement;
const rankingFields = document.getElementById("ranking-fields") as HTMLDivElement;
const postFields = document.getElementById("post-fields") as HTMLDivElement;
const tabs = document.querySelectorAll<HTMLButtonElement>(".kind-tab");

let kind: Kind = "ranking";

function setKind(next: Kind) {
  kind = next;
  tabs.forEach((tab) => {
    const isActive = tab.dataset.kind === next;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
  rankingFields.hidden = next !== "ranking";
  postFields.hidden = next !== "post";
  questionLabel.textContent = next === "ranking" ? "question" : "title";
  questionInput.placeholder =
    next === "ranking" ? "what's your question?" : "give your post a title";
  errorMsg.textContent = "";
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => setKind(tab.dataset.kind as Kind));
});

let maxOptions = 10;

async function loadMaxOptions() {
  const res = await fetch(API.siteSettings.get, {
    headers: { Authorization: `Bearer ${userId}` },
  });
  if (res.ok) {
    const data = await res.json();
    maxOptions = data.max_options_per_poll ?? 10;
  }
  updateAddBtn();
}

function updateAddBtn() {
  const count = optionsList.children.length;
  addBtn.disabled = count >= maxOptions;
  addBtn.title = count >= maxOptions ? `max ${maxOptions} options allowed` : "";
  removeBtn.disabled = count <= 2;
}

addBtn.addEventListener("click", () => {
  const count = optionsList.children.length;
  if (count >= maxOptions) return;
  const li = document.createElement("li");
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = `option ${count + 1}`;
  li.append(input);
  optionsList.append(li);
  updateAddBtn();
});

removeBtn.addEventListener("click", () => {
  if (optionsList.children.length > 2) {
    optionsList.lastElementChild?.remove();
    updateAddBtn();
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorMsg.textContent = "";

  const question = questionInput.value.trim();
  if (!question) {
    errorMsg.textContent = kind === "ranking" ? "question required." : "title required.";
    return;
  }

  const payload: Record<string, unknown> = { kind, question };

  if (kind === "ranking") {
    const options = Array.from(optionsList.querySelectorAll<HTMLInputElement>("input"))
      .map((i) => i.value.trim())
      .filter(Boolean);
    if (options.length < 2) {
      errorMsg.textContent = "at least 2 options required.";
      return;
    }
    payload.options = options;
  } else {
    const body = bodyInput.value.trim();
    if (!body) {
      errorMsg.textContent = "thought body required.";
      return;
    }
    payload.body = body;
  }

  const res = await fetch(API.polls.create, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userId}`,
    },
    body: JSON.stringify(payload),
  });

  if (res.ok) {
    window.location.replace("/start");
  } else {
    const body = await res.json().catch(() => null);
    errorMsg.textContent = body?.detail ?? "failed to create.";
  }
});

const pasteBtn = document.getElementById("paste-btn") as HTMLButtonElement;
pasteBtn.addEventListener("click", async () => {
  if (!navigator.clipboard) return;
  const text = await navigator.clipboard.readText().catch(() => null);
  if (text === null) return;
  const bodyInput = document.getElementById("body") as HTMLTextAreaElement;
  bodyInput.value = text;
});

loadMaxOptions();
