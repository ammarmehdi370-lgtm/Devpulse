export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DATABASE_URL?: string;
      REDIS_URL?: string;
      SESSION_SECRET?: string;
      JWT_PRIVATE_KEY_PATH?: string;
      JWT_PUBLIC_KEY_PATH?: string;
      FRONTEND_URL?: string;
      GITHUB_CLIENT_ID?: string;
      GITHUB_CLIENT_SECRET?: string;
      GOOGLE_CLIENT_ID?: string;
      GOOGLE_CLIENT_SECRET?: string;
      RESEND_API_KEY?: string;
      ANTHROPIC_API_KEY?: string;
      PORT?: string;
      NODE_ENV?: string;
    }
  }
}