import { API } from "../config/api";
import { getCookie } from "../utils/cookies";

const userId = getCookie("userId");
if (!userId) window.location.replace("/login");

type Kind = "ranking" | "post" | "quote";

const MAX_BODY = 3500;
const MAX_QUESTION = 200;
const MAX_OPTION = 100;
const MAX_QUOTE = 512;

const form = document.getElementById("create-form") as HTMLFormElement;
const optionsList = document.getElementById("options-list") as HTMLUListElement;
const addBtn = document.getElementById("add-option-btn") as HTMLButtonElement;
const removeBtn = document.getElementById("remove-option-btn") as HTMLButtonElement;
const errorMsg = document.getElementById("create-error") as HTMLParagraphElement;
const questionInput = document.getElementById("question") as HTMLInputElement;
const questionLabel = document.getElementById("question-label") as HTMLLabelElement;
const bodyInput = document.getElementById("body") as HTMLTextAreaElement;
const quoteBodyInput = document.getElementById("quote-body") as HTMLTextAreaElement;
const rankingFields = document.getElementById("ranking-fields") as HTMLDivElement;
const postFields = document.getElementById("post-fields") as HTMLDivElement;
const quoteFields = document.getElementById("quote-fields") as HTMLDivElement;
const tabs = document.querySelectorAll<HTMLButtonElement>(".kind-tab");

const bodyCounter = document.getElementById("body-counter") as HTMLSpanElement;
const questionCounter = document.getElementById("question-counter") as HTMLSpanElement;
const quoteCounter = document.getElementById("quote-counter") as HTMLSpanElement;

let kind: Kind = "ranking";
let maxOptions = 10;

function setKind(next: Kind) {
  kind = next;
  tabs.forEach((tab) => {
    const isActive = tab.dataset.kind === next;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
  rankingFields.hidden = next !== "ranking";
  postFields.hidden = next !== "post";
  quoteFields.hidden = next !== "quote";
  questionLabel.textContent = next === "ranking" ? "question" : next === "quote" ? "lecture" : "title";
  questionInput.placeholder =
    next === "ranking" ? "what's your question?" : next === "quote" ? "e.g. Web Engineering" : "give your post a title";
  errorMsg.textContent = "";
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => setKind(tab.dataset.kind as Kind));
});

async function loadMaxOptions() {
  const res = await fetch(API.siteSettings.get, {
    headers: { Authorization: `Bearer ${userId}` },
  });
  if (res.ok) {
    const data = await res.json();
    maxOptions = data.max_options_per_poll ?? 10;
    if (data.maintenance_mode) {
      errorMsg.textContent = "site is under maintenance — posting is currently disabled.";
      form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement>("input, textarea, button").forEach((el) => el.disabled = true);
      return;
    }
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
  const counter = document.createElement("span");
  counter.className = "option-counter body-counter";
  counter.style.display = "none";
  li.append(input, counter);
  optionsList.append(li);
  attachOptionCounter(li);
  updateAddBtn();
});

removeBtn.addEventListener("click", () => {
  if (optionsList.children.length > 2) {
    optionsList.lastElementChild?.remove();
    updateAddBtn();
  }
});

form.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
    e.preventDefault();
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
  } else if (kind === "quote") {
    const body = quoteBodyInput.value.trim();
    if (!body) {
      errorMsg.textContent = "quote body required.";
      return;
    }
    if (body.length > MAX_QUOTE) {
      errorMsg.textContent = `quote too long (max ${MAX_QUOTE} characters).`;
      return;
    }
    payload.body = body;
  } else {
    const body = bodyInput.value.trim();
    if (!body) {
      errorMsg.textContent = "thought body required.";
      return;
    }
    if (body.length > MAX_BODY) {
      errorMsg.textContent = `post too long (max ${MAX_BODY} characters).`;
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

function attachCounter(input: HTMLInputElement | HTMLTextAreaElement, counter: HTMLSpanElement, max: number, lowThreshold = 30, criticalThreshold = 10) {
  input.addEventListener("input", () => {
    const remaining = max - input.value.length;
    if (remaining < lowThreshold) {
      counter.style.display = "";
      counter.textContent = String(remaining);
      counter.classList.toggle("body-counter--low", remaining < criticalThreshold);
    } else {
      counter.style.display = "none";
    }
  });
}

function attachOptionCounter(li: HTMLLIElement) {
  const input = li.querySelector<HTMLInputElement>("input")!;
  const counter = li.querySelector<HTMLSpanElement>(".option-counter")!;
  input.maxLength = MAX_OPTION;
  attachCounter(input, counter, MAX_OPTION);
}

attachCounter(questionInput, questionCounter, MAX_QUESTION);
attachCounter(quoteBodyInput, quoteCounter, MAX_QUOTE, 100, 30);
attachCounter(bodyInput, bodyCounter, MAX_BODY, 500, 200);

const pasteBtn = document.getElementById("paste-btn") as HTMLButtonElement;
pasteBtn.addEventListener("click", async () => {
  if (!navigator.clipboard) return;
  const text = await navigator.clipboard.readText().catch(() => null);
  if (text === null) return;
  bodyInput.value = text;
});

const quotePasteBtn = document.getElementById("quote-paste-btn") as HTMLButtonElement;
quotePasteBtn.addEventListener("click", async () => {
  if (!navigator.clipboard) return;
  const text = await navigator.clipboard.readText().catch(() => null);
  if (text === null) return;
  quoteBodyInput.value = text;
  quoteBodyInput.dispatchEvent(new Event("input"));
});

Array.from(optionsList.querySelectorAll<HTMLLIElement>("li")).forEach(attachOptionCounter);

loadMaxOptions();
