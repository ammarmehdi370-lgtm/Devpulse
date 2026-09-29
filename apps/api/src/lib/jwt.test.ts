import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { generateAccessToken, generateRefreshToken, initKeys, verifyRefreshToken, verifyToken } from "./jwt.js";

const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "devpulse-jwt-test-"));
const originalPrivatePath = process.env.JWT_PRIVATE_KEY_PATH;
const originalPublicPath = process.env.JWT_PUBLIC_KEY_PATH;

beforeAll(async () => {
  const pair = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });
  const privatePath = path.join(temporaryDirectory, "private.pem");
  const publicPath = path.join(temporaryDirectory, "public.pem");
  writeFileSync(privatePath, pair.privateKey);
  writeFileSync(publicPath, pair.publicKey);
  process.env.JWT_PRIVATE_KEY_PATH = privatePath;
  process.env.JWT_PUBLIC_KEY_PATH = publicPath;
  await initKeys();
});

afterAll(() => {
  if (originalPrivatePath === undefined) delete process.env.JWT_PRIVATE_KEY_PATH;
  else process.env.JWT_PRIVATE_KEY_PATH = originalPrivatePath;
  if (originalPublicPath === undefined) delete process.env.JWT_PUBLIC_KEY_PATH;
  else process.env.JWT_PUBLIC_KEY_PATH = originalPublicPath;
  rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe("RS256 JWT utilities", () => {
  it("signs and verifies access tokens", async () => {
    const token = await generateAccessToken({
      sub: "user-1",
      email: "user@example.com",
      name: "Devpulse User",
      workspaceId: "workspace-1",
      plan: "free",
    });

    await expect(verifyToken(token)).resolves.toMatchObject({
      sub: "user-1",
      email: "user@example.com",
      workspaceId: "workspace-1",
      plan: "free",
      iss: "devpulse",
    });
  });

  it("accepts refresh tokens only through the refresh verifier", async () => {
    const token = await generateRefreshToken({ sub: "user-1" });

    await expect(verifyRefreshToken(token)).resolves.toEqual({ sub: "user-1", type: "refresh" });
    await expect(verifyToken(token)).rejects.toThrow("Access token required");
    await expect(verifyRefreshToken(await generateAccessToken({
      sub: "user-1",
      email: "user@example.com",
      name: "Devpulse User",
      workspaceId: "workspace-1",
      plan: "free",
    }))).rejects.toThrow("Refresh token required");
  });
});