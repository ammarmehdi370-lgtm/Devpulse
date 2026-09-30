export interface RequiredEnv {
  DATABASE_URL: string;
  REDIS_URL: string;
  SESSION_SECRET: string;
  JWT_PRIVATE_KEY_PATH: string;
  JWT_PUBLIC_KEY_PATH: string;
  FRONTEND_URL: string;
}

export interface OptionalEnv {
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  RESEND_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  PORT?: string;
  NODE_ENV?: string;
}

export function validateEnv(): RequiredEnv & OptionalEnv {
  const required: (keyof RequiredEnv)[] = [
    "DATABASE_URL",
    "REDIS_URL",
    "SESSION_SECRET",
    "JWT_PRIVATE_KEY_PATH",
    "JWT_PUBLIC_KEY_PATH",
    "FRONTEND_URL",
  ];
  const missing: string[] = [];

  for (const key of required) {
    if (!process.env[key]) missing.push(key);
  }

  const secret = process.env.SESSION_SECRET ?? "";
  if (secret && secret.length < 32) {
    console.error(
      `[ENV] SESSION_SECRET must be at least 32 characters (got ${secret.length})`,
    );
    console.error("Generate one: openssl rand -hex 32");
    missing.push("SESSION_SECRET (too short)");
  }

  if (missing.length > 0) {
    console.error("\n[ENV] Missing or invalid required variables:");
    for (const key of missing) console.error(`  - ${key}`);
    console.error("\nCopy .env.example to .env and fill in the required values.");
    console.error("Generate SESSION_SECRET: openssl rand -hex 32\n");
    process.exit(1);
  }

  const optionalWarnings: Record<string, string> = {
    GITHUB_CLIENT_ID: "GitHub OAuth will be disabled",
    GOOGLE_CLIENT_ID: "Google OAuth will be disabled",
    RESEND_API_KEY: "Magic-link email will not send",
    ANTHROPIC_API_KEY: "AI chat will not work",
  };
  for (const [key, warning] of Object.entries(optionalWarnings)) {
    if (!process.env[key]) console.warn(`[ENV] Warning: ${key} not set - ${warning}`);
  }

  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    REDIS_URL: process.env.REDIS_URL!,
    SESSION_SECRET: process.env.SESSION_SECRET!,
    JWT_PRIVATE_KEY_PATH: process.env.JWT_PRIVATE_KEY_PATH!,
    JWT_PUBLIC_KEY_PATH: process.env.JWT_PUBLIC_KEY_PATH!,
    FRONTEND_URL: process.env.FRONTEND_URL!,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    PORT: process.env.PORT,
    NODE_ENV: process.env.NODE_ENV,
  };
}