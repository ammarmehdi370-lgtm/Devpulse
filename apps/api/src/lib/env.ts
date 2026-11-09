import { z } from "zod";

export interface RequiredEnv {
  DATABASE_URL: string;
  REDIS_URL: string;
  SESSION_SECRET: string;
  JWT_PRIVATE_KEY_PATH: string;
  JWT_PUBLIC_KEY_PATH: string;
  FRONTEND_URL: string;
  APP_URL: string;
}

export interface OptionalEnv {
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITLAB_CLIENT_ID?: string;
  GITLAB_CLIENT_SECRET?: string;
  RESEND_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  PORT?: string;
  NODE_ENV?: string;
}

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  SESSION_SECRET: z
    .string()
    .min(32)
    .refine((value) => !value.startsWith("replace-with-")),
  JWT_PRIVATE_KEY_PATH: z.string().min(1),
  JWT_PUBLIC_KEY_PATH: z.string().min(1),
  FRONTEND_URL: z.string().url(),
  APP_URL: z.string().url(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITLAB_CLIENT_ID: z.string().optional(),
  GITLAB_CLIENT_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  PORT: z.string().optional(),
  NODE_ENV: z.string().optional(),
});

export function validateEnv(): RequiredEnv & OptionalEnv {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const invalidNames = [
      ...new Set(parsed.error.issues.map((issue) => String(issue.path[0]))),
    ];
    console.error("\n[ENV] Missing or invalid required variables:");
    for (const name of invalidNames) console.error(`  - ${name}`);
    console.error(
      "\nCopy .env.example to .env and fill in the required values.\n",
    );
    process.exit(1);
  }
  const env = parsed.data;

  const optionalWarnings: [keyof OptionalEnv, string][] = [
    ["GITHUB_CLIENT_ID", "GitHub OAuth will be disabled"],
    ["GOOGLE_CLIENT_ID", "Google OAuth will be disabled"],
    ["GITLAB_CLIENT_ID", "GitLab OAuth will be disabled"],
    ["RESEND_API_KEY", "Magic-link email will not send"],
    ["ANTHROPIC_API_KEY", "AI chat will not work"],
  ];
  for (const [key, warning] of optionalWarnings) {
    if (!env[key]) console.warn(`[ENV] Warning: ${key} not set - ${warning}`);
  }

  return {
    DATABASE_URL: env.DATABASE_URL,
    REDIS_URL: env.REDIS_URL,
    SESSION_SECRET: env.SESSION_SECRET,
    JWT_PRIVATE_KEY_PATH: env.JWT_PRIVATE_KEY_PATH,
    JWT_PUBLIC_KEY_PATH: env.JWT_PUBLIC_KEY_PATH,
    FRONTEND_URL: env.FRONTEND_URL,
    APP_URL: env.APP_URL,
    GITHUB_CLIENT_ID: env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: env.GITHUB_CLIENT_SECRET,
    GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
    GITLAB_CLIENT_ID: env.GITLAB_CLIENT_ID,
    GITLAB_CLIENT_SECRET: env.GITLAB_CLIENT_SECRET,
    RESEND_API_KEY: env.RESEND_API_KEY,
    ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY,
    PORT: env.PORT,
    NODE_ENV: env.NODE_ENV,
  };
}
