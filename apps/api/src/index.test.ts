import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "./index.js";

describe("API foundation", () => {
  it("reports service health", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok", service: "api" });
  });

  it("rejects malformed execution requests", async () => {
    const response = await request(app)
      .post("/v1/execute")
      .send({ language: "ruby", code: 42 });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid request");
  });

  it("rejects malformed file creation requests", async () => {
    const response = await request(app)
      .post("/v1/projects/not-a-project/files")
      .send({ path: "../secrets.txt", content: "x" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid request");
  });

  it("returns a dev verification token without sending email", async () => {
    const email = `magic-${Date.now()}@example.com`;
    const response = await request(app)
      .post("/api/auth/magic-link/send")
      .send({ email });

    expect(response.status).toBe(200);
    expect(response.body.token).toMatch(/^[a-f\d]{64}$/i);
    expect(response.body.verificationToken).toBe(response.body.token);
    expect(response.body.url).toContain(`/auth/verify?token=${response.body.token}`);
  });

  it("limits magic-link sends to three per email per hour", async () => {
    const email = `rate-limit-${Date.now()}@example.com`;
    const send = () => request(app).post("/api/auth/magic-link/send").send({ email });

    expect((await send()).status).toBe(200);
    expect((await send()).status).toBe(200);
    expect((await send()).status).toBe(200);
    const limited = await send();
    expect(limited.status).toBe(429);
    expect(limited.body.error).toBe("RATE_LIMITED");
  });
});
