import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { importPKCS8, importSPKI, jwtVerify, SignJWT, type JWTPayload as JosePayload } from "jose";

export interface JWTPayload {
  sub: string;
  email: string;
  name: string;
  workspaceId: string;
  plan: string;
}

type RefreshPayload = { sub: string; type: "refresh" };

let privateKey: Awaited<ReturnType<typeof importPKCS8>> | undefined;
let publicKey: Awaited<ReturnType<typeof importSPKI>> | undefined;
let keysPromise: Promise<void> | undefined;

function loadKey(envVar: string, label: "private" | "public"): string {
  const keyPath = process.env[envVar];
  const setupCommand = "bash apps/api/scripts/generate-keys.sh";
  if (!keyPath) {
    throw new Error(
      `Missing environment variable: ${envVar}\n` +
        `Add ${envVar}=./keys/${label}.pem to your .env file.\n` +
        `Generate the key pair with: ${setupCommand}`,
    );
  }

  const resolvedPath = path.resolve(keyPath);
  const workspacePath = path.resolve(process.cwd(), "apps/api", keyPath);
  const existingPath = [resolvedPath, workspacePath].find(existsSync);
  if (!existingPath) {
    throw new Error(
      `Key file not found: ${resolvedPath}\n` +
        `Also checked: ${workspacePath}\n` +
        `Generate the key pair with: ${setupCommand}`,
    );
  }

  try {
    return readFileSync(existingPath, "utf8");
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to read ${label} JWT key at ${existingPath}: ${detail}`);
  }
}

export async function initKeys(): Promise<void> {
  if (privateKey && publicKey) return;
  if (!keysPromise) {
    keysPromise = Promise.resolve().then(async () => {
      const privatePem = loadKey("JWT_PRIVATE_KEY_PATH", "private");
      const publicPem = loadKey("JWT_PUBLIC_KEY_PATH", "public");
      try {
        const loadedPrivateKey = await importPKCS8(privatePem, "RS256");
        const loadedPublicKey = await importSPKI(publicPem, "RS256");
        privateKey = loadedPrivateKey;
        publicKey = loadedPublicKey;
        console.log("[JWT] RS256 keys loaded");
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Unable to import RS256 JWT keys. Ensure private.pem is PKCS#8 and public.pem is SPKI. ${detail}`,
        );
      }
    }).catch((error: unknown) => {
      keysPromise = undefined;
      throw error;
    });
  }
  await keysPromise;
}

export async function generateAccessToken(payload: JWTPayload): Promise<string> {
  await initKeys();
  return new SignJWT({ ...payload, type: "access" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_ACCESS_EXPIRY ?? "15m")
    .setIssuer("devpulse")
    .sign(privateKey!);
}

export async function generateRefreshToken(payload: Pick<JWTPayload, "sub">): Promise<string> {
  await initKeys();
  return new SignJWT({ type: "refresh" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_REFRESH_EXPIRY ?? "30d")
    .setIssuer("devpulse")
    .setSubject(payload.sub)
    .sign(privateKey!);
}

async function verifySignedToken(token: string): Promise<JosePayload> {
  await initKeys();
  return (await jwtVerify(token, publicKey!, { issuer: "devpulse", algorithms: ["RS256"] })).payload;
}

export async function verifyToken(token: string): Promise<JWTPayload> {
  const payload = await verifySignedToken(token);
  if (payload.type !== "access") throw new Error("Access token required");
  if (typeof payload.sub !== "string" || typeof payload.email !== "string" || typeof payload.name !== "string" || typeof payload.workspaceId !== "string" || typeof payload.plan !== "string") {
    throw new Error("Access token payload is incomplete");
  }
  return payload as unknown as JWTPayload;
}

export async function verifyRefreshToken(token: string): Promise<RefreshPayload> {
  const payload = await verifySignedToken(token);
  if (payload.type !== "refresh" || typeof payload.sub !== "string") throw new Error("Refresh token required");
  return { sub: payload.sub, type: "refresh" };
}