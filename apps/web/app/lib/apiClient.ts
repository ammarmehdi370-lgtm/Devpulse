const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const body = await response.json() as { accessToken?: string };
        return body.accessToken ?? null;
      })
      .catch(() => null)
      .then((token) => {
        accessToken = token;
        return token;
      })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const requestInit: RequestInit = { ...init, headers, credentials: init.credentials ?? "include" };
  const response = await fetch(input, requestInit);
  if (response.status !== 401 || new URL(input instanceof Request ? input.url : String(input), window.location.href).pathname === "/api/auth/refresh") return response;
  const nextToken = await refreshAccessToken();
  if (!nextToken) return response;
  const retryHeaders = new Headers(init.headers);
  retryHeaders.set("Authorization", `Bearer ${nextToken}`);
  return fetch(input, { ...requestInit, headers: retryHeaders });
}