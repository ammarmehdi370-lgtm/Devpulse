const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const SESSION_EXPIRED_EVENT = "devpulse:session-expired";

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function clearAccessToken(): void {
  accessToken = null;
}

export async function logoutSession(): Promise<void> {
  clearAccessToken();
  const response = await fetch(`${API_BASE}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`Server logout failed (${response.status}).`);
  }
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const body: unknown = await response.json();
        if (
          typeof body !== "object"
          || body === null
          || !("accessToken" in body)
          || typeof body.accessToken !== "string"
        ) {
          return null;
        }
        return body.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  try {
    const token = await refreshPromise;
    setAccessToken(token);
    return token;
  } catch {
    clearAccessToken();
    return null;
  }
}

function requestUrl(input: RequestInfo | URL): string {
  return input instanceof Request ? input.url : String(input);
}

function notifySessionExpired(): void {
  clearAccessToken();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
}

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(input instanceof Request ? input.headers : undefined);
  new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  else headers.delete("Authorization");

  const credentials = "include";
  const firstInput = input instanceof Request ? input.clone() : input;
  const response = await fetch(firstInput, { ...init, headers, credentials });
  const url = new URL(
    requestUrl(input),
    typeof window === "undefined" ? API_BASE : window.location.href,
  );
  if (response.status !== 401 || url.pathname === "/api/auth/refresh") {
    return response;
  }

  const refreshedToken = await refreshAccessToken();
  if (!refreshedToken) {
    notifySessionExpired();
    return response;
  }

  const retryHeaders = new Headers(input instanceof Request ? input.headers : undefined);
  new Headers(init.headers).forEach((value, key) => retryHeaders.set(key, value));
  retryHeaders.set("Authorization", `Bearer ${refreshedToken}`);
  const retryInput = input instanceof Request ? input.clone() : input;
  const retryResponse = await fetch(retryInput, {
    ...init,
    headers: retryHeaders,
    credentials,
  });
  if (retryResponse.status === 401) notifySessionExpired();
  return retryResponse;
}

export function onSessionExpired(handler: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(SESSION_EXPIRED_EVENT, handler);
  return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
}
