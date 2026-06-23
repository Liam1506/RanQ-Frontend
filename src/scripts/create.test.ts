import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function clearAllCookies() {
  document.cookie.split("; ").forEach((c) => {
    const name = c.split("=")[0];
    if (name) document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  });
}

function setupCreateDom() {
  document.body.innerHTML = `
    <form id="create-form">
      <button class="kind-tab" data-kind="ranking" aria-selected="true">ranking</button>
      <button class="kind-tab" data-kind="post" aria-selected="false">post</button>
      <button class="kind-tab" data-kind="quote" aria-selected="false">quote</button>
      <label id="question-label">question</label>
      <input id="question" type="text" value="" />
      <span id="question-counter"></span>
      <div id="ranking-fields">
        <ul id="options-list">
          <li><input type="text" value="" /><span class="option-counter body-counter" style="display:none"></span></li>
          <li><input type="text" value="" /><span class="option-counter body-counter" style="display:none"></span></li>
        </ul>
        <button id="add-option-btn" type="button">add</button>
        <button id="remove-option-btn" type="button">remove</button>
      </div>
      <div id="post-fields" hidden>
        <textarea id="body"></textarea>
        <span id="body-counter"></span>
        <button id="paste-btn" type="button">paste</button>
      </div>
      <div id="quote-fields" hidden>
        <textarea id="quote-body"></textarea>
        <span id="quote-counter"></span>
        <button id="quote-paste-btn" type="button">paste</button>
      </div>
      <p id="create-error"></p>
      <button type="submit">submit</button>
    </form>
  `;
}

describe("create form validation", () => {
  let replaceSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clearAllCookies();
    document.cookie = "userId=test-token; path=/";
    setupCreateDom();
    replaceSpy = vi.fn();
    Object.defineProperty(window, "location", {
      value: { replace: replaceSpy },
      configurable: true,
      writable: true,
    });
    Object.defineProperty(navigator, "clipboard", {
      value: { readText: vi.fn().mockResolvedValue("") },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    clearAllCookies();
  });

  async function submitForm() {
    document.getElementById("create-form")!.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );
    await new Promise((r) => setTimeout(r, 0));
  }

  it("shows error when question is empty (ranking)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ max_options_per_poll: 10, maintenance_mode: false }), { status: 200 })
    );
    await import("./create");
    await new Promise((r) => setTimeout(r, 0));

    await submitForm();

    const error = document.getElementById("create-error") as HTMLParagraphElement;
    expect(error.textContent).toBe("question required.");
    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it("shows error when fewer than 2 ranking options are filled", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ max_options_per_poll: 10, maintenance_mode: false }), { status: 200 })
    );
    await import("./create");
    await new Promise((r) => setTimeout(r, 0));

    (document.getElementById("question") as HTMLInputElement).value = "Best color?";
    const inputs = document.querySelectorAll<HTMLInputElement>("#options-list input");
    inputs[0].value = "Red";
    inputs[1].value = "";

    await submitForm();

    const error = document.getElementById("create-error") as HTMLParagraphElement;
    expect(error.textContent).toBe("at least 2 options required.");
    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it("submits successfully when ranking has question and 2+ options", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ max_options_per_poll: 10, maintenance_mode: false }), { status: 200 })
      )
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));

    await import("./create");
    await new Promise((r) => setTimeout(r, 0));

    (document.getElementById("question") as HTMLInputElement).value = "Best color?";
    const inputs = document.querySelectorAll<HTMLInputElement>("#options-list input");
    inputs[0].value = "Red";
    inputs[1].value = "Blue";

    await submitForm();

    expect(replaceSpy).toHaveBeenCalledWith("/start");
    const [, init] = fetchSpy.mock.calls[1] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.kind).toBe("ranking");
    expect(body.options).toEqual(["Red", "Blue"]);
  });

  it("switches to post kind and shows title-required error on empty question", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ max_options_per_poll: 10, maintenance_mode: false }), { status: 200 })
    );
    await import("./create");
    await new Promise((r) => setTimeout(r, 0));

    const postTab = document.querySelector<HTMLButtonElement>("[data-kind='post']")!;
    postTab.click();

    await submitForm();

    const error = document.getElementById("create-error") as HTMLParagraphElement;
    expect(error.textContent).toBe("title required.");
  });

  it("shows error when post body is empty", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ max_options_per_poll: 10, maintenance_mode: false }), { status: 200 })
    );
    await import("./create");
    await new Promise((r) => setTimeout(r, 0));

    document.querySelector<HTMLButtonElement>("[data-kind='post']")!.click();
    (document.getElementById("question") as HTMLInputElement).value = "My post title";

    await submitForm();

    const error = document.getElementById("create-error") as HTMLParagraphElement;
    expect(error.textContent).toBe("thought body required.");
  });

  it("shows error when post body exceeds 3500 chars", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ max_options_per_poll: 10, maintenance_mode: false }), { status: 200 })
    );
    await import("./create");
    await new Promise((r) => setTimeout(r, 0));

    document.querySelector<HTMLButtonElement>("[data-kind='post']")!.click();
    (document.getElementById("question") as HTMLInputElement).value = "My post title";
    (document.getElementById("body") as HTMLTextAreaElement).value = "x".repeat(3501);

    await submitForm();

    const error = document.getElementById("create-error") as HTMLParagraphElement;
    expect(error.textContent).toContain("3500");
  });

  it("shows error when quote body exceeds 512 chars", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ max_options_per_poll: 10, maintenance_mode: false }), { status: 200 })
    );
    await import("./create");
    await new Promise((r) => setTimeout(r, 0));

    document.querySelector<HTMLButtonElement>("[data-kind='quote']")!.click();
    (document.getElementById("question") as HTMLInputElement).value = "Web Engineering";
    (document.getElementById("quote-body") as HTMLTextAreaElement).value = "x".repeat(513);

    await submitForm();

    const error = document.getElementById("create-error") as HTMLParagraphElement;
    expect(error.textContent).toContain("512");
  });

  it("disables form when maintenance mode is active", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ max_options_per_poll: 10, maintenance_mode: true }), { status: 200 })
    );
    await import("./create");
    await new Promise((r) => setTimeout(r, 0));

    const error = document.getElementById("create-error") as HTMLParagraphElement;
    expect(error.textContent).toContain("maintenance");

    const inputs = document.querySelectorAll<HTMLInputElement | HTMLButtonElement>("input, textarea, button");
    inputs.forEach((el) => expect(el.disabled).toBe(true));
  });

  it("add-option button appends a new option input", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ max_options_per_poll: 10, maintenance_mode: false }), { status: 200 })
    );
    await import("./create");
    await new Promise((r) => setTimeout(r, 0));

    const before = document.querySelectorAll("#options-list li").length;
    document.getElementById("add-option-btn")!.click();
    const after = document.querySelectorAll("#options-list li").length;
    expect(after).toBe(before + 1);
  });

  it("remove-option button removes the last option", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ max_options_per_poll: 10, maintenance_mode: false }), { status: 200 })
    );
    await import("./create");
    await new Promise((r) => setTimeout(r, 0));

    document.getElementById("add-option-btn")!.click();
    const before = document.querySelectorAll("#options-list li").length;
    document.getElementById("remove-option-btn")!.click();
    const after = document.querySelectorAll("#options-list li").length;
    expect(after).toBe(before - 1);
  });

  it("remove-option button does not go below 2 options", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ max_options_per_poll: 10, maintenance_mode: false }), { status: 200 })
    );
    await import("./create");
    await new Promise((r) => setTimeout(r, 0));

    document.getElementById("remove-option-btn")!.click();
    const count = document.querySelectorAll("#options-list li").length;
    expect(count).toBe(2);
  });
});
