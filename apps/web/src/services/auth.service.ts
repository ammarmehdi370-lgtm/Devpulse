import { eq } from "drizzle-orm";
import { getDB } from "../lib/db";
import { users, type User } from "../lib/db/schema";

const CURRENT_USER_KEY = "auth:current-user-id";

export class AuthService {
  constructor(
    private readonly onIdentityChanged?: (userId: string | null) => void,
  ) {}

  async devLogin(email = "demo@devpulse.local"): Promise<User> {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Development login is disabled in production builds.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Enter a valid email address.");
    }

    const db = await getDB();
    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = existing ?? (await db.insert(users).values({
      id: crypto.randomUUID(),
      email,
      name: email === "demo@devpulse.local" ? "Demo User" : email.split("@")[0]!,
    }).returning())[0];
    if (!user) throw new Error("Could not create or load the local development user.");

    sessionStorage.setItem(CURRENT_USER_KEY, user.id);
    this.onIdentityChanged?.(user.id);
    return user;
  }

  async getCurrentUser(): Promise<User | null> {
    const userId = sessionStorage.getItem(CURRENT_USER_KEY);
    if (!userId) return null;
    const db = await getDB();
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      sessionStorage.removeItem(CURRENT_USER_KEY);
      return null;
    }
    return user;
  }

  getCurrentUserId(): string | null {
    return sessionStorage.getItem(CURRENT_USER_KEY);
  }

  isAuthenticated(): boolean {
    return this.getCurrentUserId() !== null;
  }

  async logout(): Promise<void> {
    this.onIdentityChanged?.(null);
    sessionStorage.removeItem(CURRENT_USER_KEY);
  }
}
