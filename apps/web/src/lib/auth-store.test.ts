import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  authenticatedFetch,
  clearAccessToken,
  getAccessToken,
  logoutSession,
  onSessionExpired,
  setAccessToken,
} from "./auth-store";

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("auth store", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    clearAccessToken();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("keeps the access token in memory only", () => {
    setAccessToken("verified-token");

    expect(getAccessToken()).toBe("verified-token");
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it("sends a verified token on the next authenticated request", async () => {
    setAccessToken("verified-token");
    fetchMock.mockResolvedValueOnce(new Response("[]", { status: 200 }));

    const response = await authenticatedFetch("http://localhost:4000/v1/projects");
    const init = fetchMock.mock.calls[0]?.[1];

    expect(response.status).toBe(200);
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer verified-token");
    expect(init?.credentials).toBe("include");
  });

  it("does not forward a caller-supplied token when the store is empty", async () => {
    fetchMock.mockResolvedValueOnce(new Response("[]", { status: 200 }));

    await authenticatedFetch("http://localhost:4000/v1/projects", {
      headers: { Authorization: "Bearer stale-token" },
    });

    const init = fetchMock.mock.calls[0]?.[1];
    expect(new Headers(init?.headers).get("Authorization")).toBeNull();
  });

  it("refreshes once and retries an expired access token", async () => {
    setAccessToken("expired-token");
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(jsonResponse({ accessToken: "refreshed-token" }))
      .mockResolvedValueOnce(new Response("[]", { status: 200 }));

    const response = await authenticatedFetch("http://localhost:4000/v1/projects");
    const retryInit = fetchMock.mock.calls[2]?.[1];

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1]?.[0]).toBe("http://localhost:4000/api/auth/refresh");
    expect(new Headers(retryInit?.headers).get("Authorization")).toBe("Bearer refreshed-token");
    expect(retryInit?.credentials).toBe("include");
    expect(getAccessToken()).toBe("refreshed-token");
  });

  it("clears the token and notifies the app after a retry is unauthorized", async () => {
    const expiredHandler = vi.fn();
    const unsubscribe = onSessionExpired(expiredHandler);
    setAccessToken("expired-token");
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(jsonResponse({ accessToken: "refreshed-token" }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }));

    try {
      const response = await authenticatedFetch("http://localhost:4000/v1/projects");

      expect(response.status).toBe(401);
      expect(getAccessToken()).toBeNull();
      expect(expiredHandler).toHaveBeenCalledOnce();
    } finally {
      unsubscribe();
    }
  });

  it("clears the token and expires the refresh cookie on logout", async () => {
    setAccessToken("active-token");
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await logoutSession();

    expect(getAccessToken()).toBeNull();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://localhost:4000/api/auth/logout");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      credentials: "include",
    });
  });
});
