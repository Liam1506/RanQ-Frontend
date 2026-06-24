import { getCookie } from "./cookies";

/**
 * Thin wrapper around `fetch` that injects the `Authorization: Bearer <userId>`
 * header from the `userId` cookie and a JSON `Content-Type` when a body is
 * provided. Returns the raw `Response` so callers keep full control over
 * status checks, streaming, and per-call error handling.
 *
 * NOTE: The `userId` cookie value is currently used as the bearer token — this
 * is a known limitation of the backend's auth model and is documented in the
 * project README. The frontend faithfully sends whatever the backend issued.
 */

type Body = Record<string, unknown> | unknown[] | string | FormData | null | undefined;

export interface AuthedFetchInit extends Omit<RequestInit, "body"> {
  body?: Body;
}

export function authedFetch(url: string, init: AuthedFetchInit = {}): Promise<Response> {
  const { body, headers, ...rest } = init;
  const userId = getCookie("userId");

  const finalHeaders = new Headers(headers);
  if (userId && !finalHeaders.has("Authorization")) {
    finalHeaders.set("Authorization", `Bearer ${userId}`);
  }

  let finalBody: BodyInit | null | undefined;
  if (body === undefined || body === null) {
    finalBody = body ?? undefined;
  } else if (typeof body === "string" || body instanceof FormData) {
    finalBody = body;
  } else {
    // plain object / array — serialise as JSON and set the content-type if not
    // already overridden by the caller.
    if (!finalHeaders.has("Content-Type")) {
      finalHeaders.set("Content-Type", "application/json");
    }
    finalBody = JSON.stringify(body);
  }

  return fetch(url, { ...rest, headers: finalHeaders, body: finalBody });
}

/** Convenience helper for the most common shape: authed POST with a JSON body. */
export function authedPost(url: string, body: Body): Promise<Response> {
  return authedFetch(url, { method: "POST", body });
}
