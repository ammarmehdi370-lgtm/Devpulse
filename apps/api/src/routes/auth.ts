import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import express from "express";
import session from "express-session";
import { RedisStore } from "connect-redis";
import passport from "passport";
import { z } from "zod";
import { db } from "@devpulse/database";
import { redis } from "../lib/redis.js";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../lib/jwt.js";
import { isOAuthProviderConfigured, setupPassport } from "../lib/passport.js";
import { sendMagicLink, sendNewDeviceAlert, sendWelcomeEmail } from "../lib/email.js";

const router: express.Router = express.Router();
const frontendURL = process.env.FRONTEND_URL ?? process.env.APP_URL ?? "http://localhost:3000";
const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api/auth",
};
const MAGIC_TOKEN_TTL_SECONDS = 15 * 60;
const MAGIC_RATE_LIMIT = 3;
const MAGIC_RATE_WINDOW_SECONDS = 60 * 60;
const memoryMagicTokens = new Map<string, { value: string; expiresAt: number }>();
const memoryMagicRates = new Map<string, { count: number; expiresAt: number }>();
const isTestEnvironment = process.env.NODE_ENV === "test";
const sessionSecret = process.env.SESSION_SECRET ?? (isTestEnvironment ? randomBytes(32).toString("hex") : undefined);
if (!sessionSecret) throw new Error("SESSION_SECRET is required. Generate one with: openssl rand -hex 32");

setupPassport();

export const sessionMiddleware: express.RequestHandler = session({
  store: isTestEnvironment ? undefined : new RedisStore({
    client: redis,
    prefix: "oauth-session:",
    ttl: 600,
  }),
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  name: "dp.oauth.sid",
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 10 * 60 * 1000,
  },
});

router.use(passport.initialize());

function strategy(provider: "github" | "google", mode: "start" | "callback") {
  if (!isOAuthProviderConfigured(provider)) return (_request: express.Request, response: express.Response) =>
    response.redirect(`${frontendURL}/?auth_error=${provider}_not_configured`);
  if (mode === "start") return (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const state = randomBytes(32).toString("hex");
    (request.session as typeof request.session & { oauthState?: string }).oauthState = state;
    request.session.save((error) => {
      if (error) return next(error);
      const options: passport.AuthenticateOptions = {
        scope: provider === "github" ? ["user:email"] : ["profile", "email"],
        session: false,
        state,
      };
      return passport.authenticate(provider, options)(request, response, next);
    });
  };
  const options: passport.AuthenticateOptions = { session: false, failureRedirect: `${frontendURL}/?auth_error=${provider}_failed` };
  return passport.authenticate(provider, options);
}

function verifyOAuthState(provider: "github" | "google") {
  return (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const expected = (request.session as typeof request.session & { oauthState?: string }).oauthState;
    const received = typeof request.query.state === "string" ? request.query.state : "";
    delete (request.session as typeof request.session & { oauthState?: string }).oauthState;
    request.session.save((error) => {
      if (error) return next(error);
      if (!expected || !received || expected.length !== received.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(received))) {
        return response.redirect(`${frontendURL}/?auth_error=${provider}_failed`);
      }
      return next();
    });
  };
}

async function issueTokens(userId: string, response: express.Response): Promise<string> {
  const membership = await db.workspaceMember.findFirst({
    where: { userId },
    include: { workspace: true },
    orderBy: { joinedAt: "asc" },
  });
  if (!membership) throw new Error("OAuth user has no workspace membership");
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const tokenPayload = {
    sub: user.id,
    email: user.email,
    name: user.name ?? user.email,
    workspaceId: membership.workspaceId,
    plan: membership.workspace.plan.toLowerCase(),
  };
  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(tokenPayload),
    generateRefreshToken({ sub: user.id }),
  ]);
  response.cookie("refresh_token", refreshToken, {
    ...refreshCookieOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
  return accessToken;
}

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function memoryFallbackAllowed(): boolean {
  return process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
}

async function reserveMagicLinkAttempt(email: string): Promise<number> {
  const key = `magic-rate:${hashValue(email)}`;
  if (redis.isReady) {
    const count = await redis.eval(
      "local count = redis.call('INCR', KEYS[1]); if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]); end; return count",
      { keys: [key], arguments: [String(MAGIC_RATE_WINDOW_SECONDS)] },
    );
    return Number(count);
  }
  if (!memoryFallbackAllowed()) throw new Error("Rate-limit storage is unavailable");
  const now = Date.now();
  const current = memoryMagicRates.get(key);
  if (!current || current.expiresAt <= now) {
    memoryMagicRates.set(key, { count: 1, expiresAt: now + MAGIC_RATE_WINDOW_SECONDS * 1000 });
    return 1;
  }
  current.count += 1;
  return current.count;
}

async function storeMagicToken(key: string, email: string): Promise<void> {
  const value = JSON.stringify({ email, createdAt: Date.now() });
  if (redis.isReady) {
    await redis.set(key, value, { EX: MAGIC_TOKEN_TTL_SECONDS });
    return;
  }
  if (!memoryFallbackAllowed()) throw new Error("Magic-link storage is unavailable");
  memoryMagicTokens.set(key, { value, expiresAt: Date.now() + MAGIC_TOKEN_TTL_SECONDS * 1000 });
}

async function consumeMagicToken(key: string): Promise<{ email: string } | null> {
  const memoryValue = memoryMagicTokens.get(key);
  if (memoryValue) {
    memoryMagicTokens.delete(key);
    if (memoryValue.expiresAt > Date.now()) return JSON.parse(memoryValue.value) as { email: string };
  }
  if (!redis.isReady) return null;
  const value = await redis.getDel(key);
  if (!value) return null;
  try {
    return JSON.parse(value) as { email: string };
  } catch {
    return null;
  }
}

async function deleteMagicToken(key: string): Promise<void> {
  memoryMagicTokens.delete(key);
  if (redis.isReady) await redis.del(key);
}

async function ensureWorkspaceMembership(userId: string, name: string): Promise<void> {
  if (await db.workspaceMember.findFirst({ where: { userId }, select: { userId: true } })) return;
  await db.$transaction(async (transaction) => {
    if (await transaction.workspaceMember.findFirst({ where: { userId }, select: { userId: true } })) return;
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "workspace"}-${randomBytes(4).toString("hex")}`;
    const workspace = await transaction.workspace.create({ data: { name: `${name}'s workspace`, slug, ownerId: userId } });
    await transaction.workspaceMember.create({ data: { userId, workspaceId: workspace.id, role: "OWNER" } });
  });
}

async function sendMagicLinkHandler(request: express.Request, response: express.Response): Promise<express.Response> {
  const validation = z.object({ email: z.string().trim().email().max(254) }).safeParse(request.body);
  if (!validation.success) return response.status(400).json({ error: "Invalid email address" });
  const email = validation.data.email.toLowerCase();
  let attemptCount: number;
  try {
    attemptCount = await reserveMagicLinkAttempt(email);
  } catch {
    return response.status(503).json({ error: "RATE_LIMIT_UNAVAILABLE", message: "Sign-in is temporarily unavailable. Try again later." });
  }
  if (attemptCount > MAGIC_RATE_LIMIT) {
    return response.status(429).json({ error: "RATE_LIMITED", message: "Too many sign-in links requested. Try again in an hour." });
  }

  const token = randomBytes(32).toString("hex");
  const tokenKey = `magic:${hashValue(token)}`;
  try {
    await storeMagicToken(tokenKey, email);
  } catch {
    return response.status(503).json({ error: "MAGIC_LINK_UNAVAILABLE", message: "Sign-in is temporarily unavailable. Try again later." });
  }

  if (memoryFallbackAllowed()) {
    const url = `${frontendURL}/auth/verify?token=${encodeURIComponent(token)}`;
    return response.json({ token, verificationToken: token, message: "Dev mode: use this token directly", url });
  }

  try {
    const user = await db.user.findUnique({ where: { email }, select: { name: true } });
    await sendMagicLink(email, token, user?.name ?? undefined);
    return response.json({ message: "Check your email for the sign-in link" });
  } catch (emailError) {
    await deleteMagicToken(tokenKey).catch(() => undefined);
    console.error("Magic-link email send failed:", emailError);
    return response.status(503).json({ error: "EMAIL_FAILED", message: "Could not send email. Try again." });
  }
}

async function verifyMagicLinkHandler(request: express.Request, response: express.Response, next: express.NextFunction): Promise<express.Response | void> {
  const token = typeof request.body?.token === "string" ? request.body.token : "";
  if (!/^[a-f\d]{64}$/i.test(token)) return response.status(400).json({ error: "INVALID_TOKEN", message: "This link is invalid or expired" });
  try {
    const stored = await consumeMagicToken(`magic:${hashValue(token)}`);
    if (!stored?.email) return response.status(400).json({ error: "INVALID_TOKEN", message: "This link has expired or already been used" });

    let user = await db.user.findUnique({ where: { email: stored.email } });
    let isNewSignup = false;
    if (!user) {
      const name = stored.email.split("@")[0] || "Devpulse User";
      try {
        user = await db.$transaction(async (transaction) => {
          const created = await transaction.user.create({ data: { email: stored.email, name } });
          const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "workspace"}-${randomBytes(4).toString("hex")}`;
          const workspace = await transaction.workspace.create({ data: { name: `${name}'s workspace`, slug, ownerId: created.id } });
          await transaction.workspaceMember.create({ data: { userId: created.id, workspaceId: workspace.id, role: "OWNER" } });
          return created;
        });
        isNewSignup = true;
      } catch (error) {
        if ((error as { code?: string }).code !== "P2002") throw error;
        user = await db.user.findUnique({ where: { email: stored.email } });
        if (!user) throw error;
      }
    }

    const name = user.name || stored.email.split("@")[0] || "Devpulse User";
    await ensureWorkspaceMembership(user.id, name);
    if (process.env.NODE_ENV !== "development" && process.env.NODE_ENV !== "test") {
      if (isNewSignup) void sendWelcomeEmail(user.email, name).catch((error: unknown) => console.error("Welcome email send failed:", error));
      const ipAddress = request.ip || request.socket.remoteAddress || "unknown";
      const userAgent = request.headers["user-agent"] ?? "unknown";
      void sendNewDeviceAlert(user.email, name, ipAddress, userAgent).catch((error: unknown) => console.error("Sign-in alert email failed:", error));
    }

    const accessToken = await issueTokens(user.id, response);
    return response.json({ user: { id: user.id, email: user.email, name }, accessToken });
  } catch (error) {
    return next(error);
  }
}

if (process.env.NODE_ENV !== "production") {
  router.get("/dev-bypass", async (request, response, next) => {
    const email =
      typeof request.query.email === "string" && request.query.email
        ? request.query.email
        : "demo@devpulse.local";

    try {
      const user = await db.user.findUnique({
        where: { email },
        include: { memberships: { include: { workspace: true } } },
      });
      if (!user) {
        return response.status(404).json({
          error: "Dev user not found",
          hint: "Run: pnpm seed",
        });
      }

      const membership = user.memberships[0];
      const [accessToken, refreshToken] = await Promise.all([
        generateAccessToken({
          sub: user.id,
          email: user.email,
          name: user.name ?? user.email,
          workspaceId: membership?.workspaceId ?? "",
          plan: membership?.workspace.plan.toLowerCase() ?? "free",
        }),
        generateRefreshToken({ sub: user.id }),
      ]);

      response.cookie("devpulse_session", accessToken, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 15 * 60 * 1000,
      });
      response.cookie("refresh_token", refreshToken, {
        ...refreshCookieOptions,
        secure: false,
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      return response.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        accessToken,
        workspaceId: membership?.workspaceId,
      });
    } catch (error) {
      return next(error);
    }
  });
}

router.post("/magic-link/send", sendMagicLinkHandler);
router.post("/magic-link", sendMagicLinkHandler);
router.post("/magic-link/verify", verifyMagicLinkHandler);

for (const provider of ["github", "google"] as const) {
  router.get(`/${provider}`, strategy(provider, "start"));
  router.get(`/${provider}/callback`, verifyOAuthState(provider), strategy(provider, "callback"), async (request, response, next) => {
    try {
      const authenticatedUser = request.user as { id: string } | undefined;
      if (!authenticatedUser?.id) return response.redirect(`${frontendURL}/?auth_error=${provider}_failed`);
      const accessToken = await issueTokens(authenticatedUser.id, response);
      return response.redirect(`${frontendURL}/auth/callback#access_token=${encodeURIComponent(accessToken)}`);
    } catch (error) {
      return next(error);
    }
  });
}

router.post("/refresh", async (request, response) => {
  const refreshToken = request.cookies?.refresh_token as string | undefined
    ?? request.headers.cookie?.match(/(?:^|; )refresh_token=([^;]+)/)?.[1];
  if (!refreshToken) return response.status(401).json({ error: "Refresh token required" });
  try {
    const payload = await verifyRefreshToken(refreshToken);
    const accessToken = await issueTokens(payload.sub, response);
    return response.json({ accessToken });
  } catch {
    response.clearCookie("refresh_token", refreshCookieOptions);
    return response.status(401).json({ error: "Refresh token is invalid or expired" });
  }
});

router.post("/logout", (_request, response) => {
  response.clearCookie("refresh_token", refreshCookieOptions);
  return response.status(204).send();
});

export { router as authRouter };