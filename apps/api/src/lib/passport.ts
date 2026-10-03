import { randomBytes } from "node:crypto";
import passport from "passport";
import { Strategy as GitHubStrategy, type Profile as GitHubProfile } from "passport-github2";
import { Strategy as GoogleStrategy, type Profile as GoogleProfile } from "passport-google-oauth20";
import { db } from "@devpulse/database";

type Provider = "github" | "google";
type ProviderProfile = GitHubProfile | GoogleProfile;

async function findOrCreateOAuthUser(provider: Provider, profile: ProviderProfile, done: (error: Error | null, user?: Express.User) => void): Promise<void> {
  try {
    const providerAccountId = profile.id;
    const account = await db.oAuthAccount.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId } },
      include: { user: true },
    });
    if (account) {
      await db.user.update({ where: { id: account.userId }, data: { avatarUrl: profile.photos?.[0]?.value ?? null } });
      done(null, account.user);
      return;
    }

    const verifiedEmail = profile.emails?.find((entry) => "verified" in entry && entry.verified)?.value;
    const email = verifiedEmail ?? `${provider}-${providerAccountId}@devpulse.local`;
    const name = profile.displayName || profile.username || `${provider} user`;
    const avatarUrl = profile.photos?.[0]?.value ?? null;
    const user = await db.$transaction(async (transaction) => {
      let existingUser = verifiedEmail ? await transaction.user.findUnique({ where: { email } }) : null;
      if (!existingUser) {
        existingUser = await transaction.user.create({ data: { email, name, avatarUrl } });
        const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "workspace"}-${randomBytes(4).toString("hex")}`;
        const workspace = await transaction.workspace.create({ data: { name: `${name}'s workspace`, slug, ownerId: existingUser.id } });
        await transaction.workspaceMember.create({ data: { userId: existingUser.id, workspaceId: workspace.id, role: "OWNER" } });
      } else {
        existingUser = await transaction.user.update({ where: { id: existingUser.id }, data: { name, avatarUrl } });
      }
      const membership = await transaction.workspaceMember.findFirst({ where: { userId: existingUser.id } });
      if (!membership) {
        const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "workspace"}-${randomBytes(4).toString("hex")}`;
        const workspace = await transaction.workspace.create({ data: { name: `${name}'s workspace`, slug, ownerId: existingUser.id } });
        await transaction.workspaceMember.create({ data: { userId: existingUser.id, workspaceId: workspace.id, role: "OWNER" } });
      }
      await transaction.oAuthAccount.create({ data: { userId: existingUser.id, provider, providerAccountId } });
      return existingUser;
    });
    done(null, user);
  } catch (error) {
    done(error instanceof Error ? error : new Error("OAuth account setup failed"));
  }
}

export function setupPassport(): void {
  const githubClientId = process.env.GITHUB_CLIENT_ID;
  const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;
  const githubCallbackUrl = process.env.GITHUB_CALLBACK_URL;
  if (githubClientId?.trim() && githubClientSecret?.trim() && githubCallbackUrl?.trim()) {
    passport.use(new GitHubStrategy({
      clientID: githubClientId,
      clientSecret: githubClientSecret,
      callbackURL: githubCallbackUrl,
      scope: ["user:email"],
      passReqToCallback: false,
    }, (_accessToken: string, _refreshToken: string, profile: GitHubProfile, done: (error: Error | null, user?: Express.User) => void) => {
      void findOrCreateOAuthUser("github", profile, done);
    }));
    console.log("[Auth] GitHub OAuth configured");
  } else {
    console.warn("[Auth] GitHub OAuth not configured (check GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and GITHUB_CALLBACK_URL)");
  }

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const googleCallbackUrl = process.env.GOOGLE_CALLBACK_URL;
  if (googleClientId?.trim() && googleClientSecret?.trim() && googleCallbackUrl?.trim()) {
    passport.use(new GoogleStrategy({
      clientID: googleClientId,
      clientSecret: googleClientSecret,
      callbackURL: googleCallbackUrl,
      scope: ["profile", "email"],
    }, (_accessToken: string, _refreshToken: string, profile: GoogleProfile, done: (error: Error | null, user?: Express.User) => void) => {
      void findOrCreateOAuthUser("google", profile, done);
    }));
    console.log("[Auth] Google OAuth configured");
  } else {
    console.warn("[Auth] Google OAuth not configured (check GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_CALLBACK_URL)");
  }
}

export function isOAuthProviderConfigured(provider: Provider): boolean {
  return provider === "github"
    ? Boolean(process.env.GITHUB_CLIENT_ID?.trim() && process.env.GITHUB_CLIENT_SECRET?.trim() && process.env.GITHUB_CALLBACK_URL?.trim())
    : Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim() && process.env.GOOGLE_CALLBACK_URL?.trim());
}