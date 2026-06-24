export function getCookie(name: string): string | undefined {
  return document.cookie.split("; ").find((c) => c.startsWith(name + "="))?.split("=")[1];
}

export function setCookie(name: string, value: string, days = 30) {
  const maxAge = days * 24 * 60 * 60;
  // `Secure` is omitted on http:// (e.g. local `astro dev`) because browsers
  // would silently drop the cookie; in production (https) it is always set.
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
}

export function deleteCookie(name: string) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${secure}`;
}
