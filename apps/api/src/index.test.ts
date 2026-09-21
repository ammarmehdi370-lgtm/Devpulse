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
});
