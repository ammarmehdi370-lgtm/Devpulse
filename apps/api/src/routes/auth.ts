import { randomBytes, timingSafeEqual } from "node:crypto";
import express from "express";
import session from "express-session";
import { RedisStore } from "connect-redis";
import passport from "passport";
import { db } from "@devpulse/database";
import { redis } from "../lib/redis.js";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../lib/jwt.js";
import { isOAuthProviderConfigured, setupPassport } from "../lib/passport.js";

const router: express.Router = express.Router();
const frontendURL = process.env.FRONTEND_URL ?? process.env.APP_URL ?? "http://localhost:3000";
const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api/auth",
};

if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be configured in production");
}

setupPassport();

router.use(session({
  name: "devpulse_oauth_state",
  ...(process.env.NODE_ENV === "test" ? {} : { store: new RedisStore({ client: redis, ttl: 600 }) }),
  secret: process.env.SESSION_SECRET ?? "devpulse-development-oauth-session-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    ...refreshCookieOptions,
    maxAge: 10 * 60 * 1000,
  },
}));
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