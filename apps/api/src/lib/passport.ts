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
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET && process.env.GITHUB_CALLBACK_URL) {
    passport.use(new GitHubStrategy({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL,
      scope: ["user:email"],
      passReqToCallback: false,
    }, (_accessToken: string, _refreshToken: string, profile: GitHubProfile, done: (error: Error | null, user?: Express.User) => void) => {
      void findOrCreateOAuthUser("github", profile, done);
    }));
  }

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ["profile", "email"],
    }, (_accessToken: string, _refreshToken: string, profile: GoogleProfile, done: (error: Error | null, user?: Express.User) => void) => {
      void findOrCreateOAuthUser("google", profile, done);
    }));
  }
}

export function isOAuthProviderConfigured(provider: Provider): boolean {
  return provider === "github"
    ? Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET && process.env.GITHUB_CALLBACK_URL)
    : Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL);
}