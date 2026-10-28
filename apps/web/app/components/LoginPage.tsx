"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { setAccessToken } from "../lib/apiClient";
import { DevpulseLogo } from "../../src/components/DevpulseLogo";
import {
  Terminal,
  Zap,
  ShieldCheck,
  Lock,
  KeyRound,
  Mail,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

type OAuthProviders = {
  github: boolean;
  google: boolean;
  magicLink: boolean;
};

type EmailLoginErrorCode = string;

interface DevMagicLinkResponse {
  mode: "development";
  message: string;
  token: string;
  url: string;
}

interface ProdMagicLinkResponse {
  mode: "production";
  message: string;
}

interface MagicLinkErrorResponse {
  mode?: never;
  error: string;
  message: string;
}

type MagicLinkResponse = DevMagicLinkResponse | ProdMagicLinkResponse | MagicLinkErrorResponse;

type EmailLoginState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "sent"; email: string }
  | { status: "dev-token"; token: string; url: string }
  | { status: "error"; code: EmailLoginErrorCode; message: string };

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function isOAuthProviders(value: unknown): value is OAuthProviders {
  if (typeof value !== "object" || value === null) return false;
  const providers = value as Record<string, unknown>;
  return typeof providers.github === "boolean"
    && typeof providers.google === "boolean"
    && typeof providers.magicLink === "boolean";
}

function isMagicLinkResponse(value: unknown): value is MagicLinkResponse {
  if (typeof value !== "object" || value === null) return false;
  const result = value as Record<string, unknown>;
  if (typeof result.message !== "string") return false;
  if (result.mode === "development") {
    return typeof result.token === "string" && typeof result.url === "string";
  }
  if (result.mode === "production") return true;
  return typeof result.error === "string";
}

export const LoginPage: React.FC = () => {
  const { loginAndLoad, isDataLoading, setPage } = useApp();
  const [email, setEmail] = useState("");
  const [latency, setLatency] = useState(14);
  const [instances, setInstances] = useState(1482);
  const [isLoading, setIsLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState("");
  const [authError, setAuthError] = useState("");
  const [emailLoginState, setEmailLoginState] = useState<EmailLoginState>({ status: "idle" });
  const [oauthProviders, setOAuthProviders] = useState<OAuthProviders | null>(null);
  const [oauthProviderError, setOAuthProviderError] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("auth_error") ?? params.get("error");
    if (error) {
      const messages: Record<string, string> = {
        github_failed: "GitHub sign in failed. Please try again.",
        github_auth_failed: "GitHub sign in failed. Please try again.",
        google_failed: "Google sign in failed. Please try again.",
        google_auth_failed: "Google sign in failed. Please try again.",
        gitlab_auth_failed: "GitLab sign in failed. Please try again.",
        github_not_configured: "GitHub sign in is not configured yet.",
        google_not_configured: "Google sign in is not configured yet.",
        oauth_state_mismatch: "Session expired during sign in. Please try again.",
        oauth_callback_missing_token: "Sign in could not be completed. Please try again.",
      };
      setAuthError(messages[error] || "Sign in could not be completed. Please try again.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${apiUrl}/api/auth/providers`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Provider status request failed (${response.status})`);
        const providers: unknown = await response.json();
        if (!isOAuthProviders(providers)) throw new Error("Provider status response was invalid");
        setOAuthProviders(providers);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error("Unable to load OAuth provider status:", error);
        setOAuthProviderError(true);
        setAuthError("Unable to check sign-in availability. Please refresh and try again.");
      });
    return () => controller.abort();
  }, []);

  const handleEmailSubmit = async () => {
    const requestedEmail = email.trim();
    if (!requestedEmail) {
      setEmailLoginState({ status: "error", code: "UNKNOWN", message: "Enter your email address to continue." });
      return;
    }

    setEmailLoginState({ status: "submitting" });
    setAuthError("");
    try {
      const response = await fetch(`${apiUrl}/api/auth/magic-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: requestedEmail }),
      });
      const result: unknown = await response.json();
      if (!isMagicLinkResponse(result)) {
        throw new Error("The sign-in response was invalid. Please try again.");
      }

      if (!response.ok) {
        const errorCode = "error" in result ? result.error : "UNKNOWN";
        const code: EmailLoginErrorCode = errorCode === "EMAIL_NOT_CONFIGURED"
          ? "EMAIL_NOT_CONFIGURED"
          : errorCode === "EMAIL_FAILED" ? "EMAIL_FAILED" : "UNKNOWN";
        const message = code === "EMAIL_NOT_CONFIGURED"
          ? "Email login is not available right now. Use GitHub or Google to sign in."
          : code === "EMAIL_FAILED"
            ? "Could not send email. Please try again."
            : result.message;
        setEmailLoginState({ status: "error", code, message });
        return;
      }

      if (result.mode === "development") {
        setEmailLoginState({ status: "dev-token", token: result.token, url: result.url });
        return;
      }

      if (result.mode === "production") {
        setEmailLoginState({ status: "sent", email: requestedEmail });
        return;
      }

      throw new Error("The sign-in response was invalid. Please try again.");
    } catch (error) {
      setEmailLoginState({
        status: "error",
        code: "UNKNOWN",
        message: error instanceof Error ? error.message : "Unable to send sign-in link.",
      });
    }
  };

  const handleLoginSuccess = async () => {
    setPage(
      localStorage.getItem("devpulse_theme_selected") === "true"
        ? "repositories"
        : "theme",
    );
  };

  const handleTokenVerify = async (token: string) => {
    setIsLoading(true);
    setLoginMethod("email");
    setEmailLoginState({ status: "submitting" });
    try {
      const response = await fetch(`${apiUrl}/api/auth/magic-link/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token }),
      });
      const result = await response.json() as {
        accessToken?: string;
        user?: { email?: string; name?: string };
        message?: string;
      };
      if (!response.ok || !result.accessToken || !result.user?.email) {
        throw new Error(result.message ?? "Unable to verify magic link.");
      }
      setAccessToken(result.accessToken);
      await loginAndLoad(result.user.email, result.user.name);
      await handleLoginSuccess();
    } catch (error) {
      setEmailLoginState({
        status: "error",
        code: "VERIFY_FAILED",
        message: error instanceof Error ? error.message : "Unable to verify magic link.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Live telemetry pulse
  useEffect(() => {
    const interval = setInterval(() => {
      setLatency((prev) => {
        const delta = Math.floor(Math.random() * 5) - 2;
        return Math.max(9, Math.min(22, prev + delta));
      });
      if (Math.random() > 0.6) {
        setInstances((prev) => prev + (Math.random() > 0.5 ? 1 : -1));
      }
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  const handleDevBypass = async (
    provider: "github" | "google" | "gitlab" | "sso",
  ) => {
    setAuthError("");

    if (process.env.NODE_ENV !== "development") {
      const startUrl =
        provider === "github"
          ? `${apiUrl}/api/auth/github`
          : provider === "google"
            ? `${apiUrl}/api/auth/google`
            : `${apiUrl}/api/auth/${provider}/start`;
      window.location.assign(startUrl);
      return;
    }

    setIsLoading(true);
    setLoginMethod(provider);
    try {
      await loginAndLoad("demo@devpulse.local", "Demo User");
      await handleLoginSuccess();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to sign in. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-8 bg-[var(--login-bg)] bg-grid-pattern relative overflow-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[var(--login-glow)] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[var(--login-glow-secondary)] rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[1080px] grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10">
        {/* Left Card: Login Form */}
        <div className="lg:col-span-7 bg-[var(--login-panel)] backdrop-blur-xl border border-[var(--login-border)] rounded-2xl p-8 sm:p-10 shadow-[var(--login-shadow)] relative">
          {/* Top Brand Header */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <DevpulseLogo size="md" variant="full" theme="dark" />
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--surface-control)] border border-[var(--login-border-soft)] text-[var(--secondary-readable)] text-[11px] font-mono font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--secondary)] animate-pulse" />
              DEV PREVIEW v2.4
            </div>
          </div>

          {/* Headline & Description */}
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-high)] tracking-tight leading-tight mb-3">
            Build at the speed of thought.
          </h1>
          <p className="text-[var(--login-muted)] text-sm sm:text-base mb-8 leading-relaxed">
            Sign in to access your cloud workspaces, ephemeral devboxes, and
            neural coding agents.
          </p>
          {authError && (
            <div role="alert" className="mb-5 flex items-center gap-2 rounded-xl border border-[var(--login-error)] bg-[var(--surface-danger)] px-4 py-3 text-xs text-[var(--login-error)]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {authError}
            </div>
          )}
          {/* Auth Providers */}
          <div className="space-y-3 mb-6">
            {/* Continue with GitHub (Primary Lavendar / Purple Button) */}
            <button
              type="button"
              onClick={() => void handleDevBypass("github")}
              disabled={isLoading || isDataLoading || (process.env.NODE_ENV !== "development" && !oauthProviders?.github)}
              title={oauthProviders?.github ? undefined : oauthProviders ? "GitHub login is not available" : oauthProviderError ? "Unable to check GitHub login availability" : "Checking GitHub login availability"}
              className="w-full py-3.5 px-4 rounded-xl bg-[var(--accent-readable)] hover:bg-[var(--login-accent-hover)] active:scale-[0.99] text-[var(--accent-fg)] font-semibold text-sm flex items-center justify-center gap-3 transition-all duration-150 shadow-[var(--shadow-card)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
              <span>Continue with GitHub</span>
            </button>

            <button
              type="button"
              onClick={() => void handleDevBypass("google")}
              disabled={isLoading || isDataLoading || (process.env.NODE_ENV !== "development" && !oauthProviders?.google)}
              title={oauthProviders?.google ? undefined : oauthProviders ? "Google login is not available" : oauthProviderError ? "Unable to check Google login availability" : "Checking Google login availability"}
              className="w-full py-3 px-4 rounded-xl bg-[var(--login-input-bg)] hover:bg-[var(--surface-control-hover)] border border-[var(--login-input-border)] text-[var(--body-text)] font-medium text-sm flex items-center justify-center gap-3 transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <span aria-hidden="true" className="text-lg font-bold text-[var(--login-code-function)]">G</span>
              <span>Continue with Google</span>
            </button>

            {/* Continue with GitLab */}
            <button
              onClick={() => void handleDevBypass("gitlab")}
              disabled={isLoading || isDataLoading}
              className="w-full py-3 px-4 rounded-xl bg-[var(--login-input-bg)] hover:bg-[var(--surface-control-hover)] border border-[var(--login-input-border)] text-[var(--body-text)] font-medium text-sm flex items-center justify-center gap-3 transition-colors duration-150"
            >
              <svg
                className="w-5 h-5 text-[var(--login-brand-orange)]"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="m23.6 9.57-.03-.08-3.48-8.87a.89.89 0 0 0-1.68 0L15.35 8H8.65L5.59.62a.89.89 0 0 0-1.68 0L.43 9.49l-.03.08a5.9 5.9 0 0 0 2.08 6.74L12 23.4l9.52-7.09a5.9 5.9 0 0 0 2.08-6.74Z" />
              </svg>
              <span>
                {isLoading && loginMethod === "gitlab"
                  ? "Connecting GitLab..."
                  : "Continue with GitLab"}
              </span>
            </button>

            {/* Single Sign-On (SSO / SAML) */}
            <button
              onClick={() => void handleDevBypass("sso")}
              disabled={isLoading || isDataLoading}
              className="w-full py-3 px-4 rounded-xl bg-[var(--login-input-bg)] hover:bg-[var(--surface-control-hover)] border border-[var(--login-input-border)] text-[var(--body-text)] font-medium text-sm flex items-center justify-center gap-3 transition-colors duration-150"
            >
              <KeyRound className="w-4 h-4 text-[var(--login-muted)]" />
              <span>
                {isLoading && loginMethod === "sso"
                  ? "Handshaking SAML..."
                  : "Single Sign-On (SSO / SAML)"}
              </span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-6">
            <div className="border-t border-[var(--login-divider)] w-full" />
            <span className="bg-[var(--login-panel)] px-3 font-mono text-[11px] uppercase tracking-wider text-[var(--login-code-muted)] absolute">
              OR CONTINUE WITH WORK EMAIL
            </span>
          </div>

          {/* Email Input & Send Magic Link */}
          <div className="space-y-3">
            {emailLoginState.status === "sent" && (
              <div role="status" className="rounded-xl border border-[var(--login-border-soft)] bg-[var(--surface-control)] p-5 text-sm text-[var(--login-success-text)]">
                <div className="flex items-center gap-2 font-semibold text-[var(--text)]">
                  <CheckCircle2 className="h-5 w-5 text-[var(--login-success)]" />
                  Check your email
                </div>
                <p className="mt-3 text-[var(--login-success-text)]">We sent a sign-in link to</p>
                <p className="mt-1 break-all font-mono text-[var(--text)]">{emailLoginState.email}</p>
                <p className="mt-3 text-xs text-[var(--login-muted)]">Link expires in 15 minutes.</p>
                <button
                  type="button"
                  onClick={() => setEmailLoginState({ status: "idle" })}
                  className="mt-4 text-xs font-medium text-[var(--accent-readable)] hover:text-[var(--text)]"
                >
                  ← Try a different email
                </button>
              </div>
            )}
            {emailLoginState.status === "dev-token" && (
              <div role="status" className="rounded-xl border border-[var(--login-border-strong)] bg-[var(--login-panel)] p-5 text-sm">
                <p className="font-semibold text-[var(--text)]">🛠 Dev mode</p>
                <p className="mt-3 text-[var(--accent-readable)]">Click the link to sign in:</p>
                <a
                  href={emailLoginState.url}
                  onClick={(event) => {
                    event.preventDefault();
                    void handleTokenVerify(emailLoginState.token);
                  }}
                  className="mt-3 inline-flex items-center gap-2 font-medium text-[var(--accent-readable)] hover:text-[var(--text)]"
                >
                  Sign in now <ArrowRight className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setEmailLoginState({ status: "idle" })}
                  className="mt-4 block text-xs font-medium text-[var(--login-muted)] hover:text-[var(--text)]"
                >
                  ← Try a different email
                </button>
              </div>
            )}
            {(emailLoginState.status === "idle"
              || emailLoginState.status === "submitting"
              || emailLoginState.status === "error") && (
              <>
                {emailLoginState.status === "error" && (
                  <div role="alert" className="flex items-center gap-2 rounded-xl border border-[var(--login-error)] bg-[var(--surface-danger)] px-4 py-3 text-xs text-[var(--login-error)]">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {emailLoginState.message}
                  </div>
                )}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--login-code-muted)]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (emailLoginState.status !== "idle" && emailLoginState.status !== "submitting") {
                        setEmailLoginState({ status: "idle" });
                      }
                    }}
                    onKeyDown={(event) => event.key === "Enter" && void handleEmailSubmit()}
                    placeholder="dev@company.com"
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--login-input-bg)] border border-[var(--login-input-border)] text-[var(--text)] placeholder:text-[var(--text-placeholder)] text-sm focus:outline-none focus:border-[var(--repository-focus)] focus:ring-1 focus:ring-[var(--focus-ring)] transition-all font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void handleEmailSubmit()}
                  disabled={emailLoginState.status === "submitting"}
                  className="w-full py-3 px-4 rounded-xl bg-[var(--surface-control)] hover:bg-[var(--surface-control-hover)] border border-[var(--login-input-border)] text-[var(--text)] font-medium text-sm flex items-center justify-center gap-2 transition-all group disabled:cursor-wait disabled:opacity-60"
                >
                  <span>
                    {emailLoginState.status === "submitting" ? "Sending sign-in link..." : "Send Magic Link"}
                  </span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </>
            )}
          </div>

          {/* Footer Security Badges */}
          <div className="mt-8 pt-6 border-t border-[var(--login-divider)] flex flex-wrap items-center justify-center gap-6 text-[12px] font-mono text-[var(--login-text-secondary)]">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[var(--login-success)]" />
              <span>SOC2 Type II</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-[var(--login-success)]" />
              <span>HIPAA Compliant</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[var(--accent)]" />
              <span>Zero Query Retention</span>
            </div>
          </div>
        </div>

        {/* Right Column: Telemetry Daemon & Feature Badges */}
        <div className="lg:col-span-5 space-y-6">
          {/* Telemetry Daemon Box */}
          <div className="bg-[var(--login-aside)] border border-[var(--login-border)] rounded-2xl p-6 font-mono text-xs shadow-[var(--login-terminal-shadow)] terminal-card relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--login-border-soft)]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--danger)]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--warning)]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--success)]" />
                <span className="ml-2 text-[var(--login-muted)] flex items-center gap-1">
                  <Terminal className="w-3.5 h-3.5" />
                  telemetry.daemon
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--surface-control)] border border-[var(--login-border-soft)] text-[var(--secondary-readable)] text-[10px] font-semibold tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--secondary)] animate-ping" />
                LIVE
              </div>
            </div>

            {/* Terminal Lines */}
            <div className="space-y-2.5 leading-relaxed">
              <div className="flex justify-between">
                <span className="text-[var(--login-code-keyword)]">[HOST]</span>
                <span className="text-[var(--login-code-foreground)]">node-alpha-71</span>
                <span className="text-[var(--login-code-number)] font-semibold">READY</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--login-code-keyword)]">[AUTH]</span>
                <span className="text-[var(--login-code-foreground)]">handshake protocol:</span>
                <span className="text-[var(--text)] font-medium">mTLS-v1.3</span>
              </div>
              <div className="text-[var(--login-code-return)] pt-1">
                ☁ Connecting to cluster:{" "}
                <span className="underline">us-east-1a</span>
              </div>
              <div className="flex items-center justify-between text-[var(--login-muted)] bg-[var(--login-code-bg)] p-2 rounded-lg border border-[var(--login-border-soft)]">
                <span>round-trip latency:</span>
                <span className="text-[var(--login-code-string)] font-bold text-sm font-mono">
                  {latency}ms
                </span>
              </div>
              <div className="text-[var(--login-code-function)] pt-1 flex items-center gap-2">
                <span>λ orchestrator ephemeral instances available:</span>
                <span className="text-[var(--text)] font-bold">
                  {instances.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Sub-Second Spinup Card */}
          <div className="bg-[var(--login-panel)] border border-[var(--login-border)] rounded-2xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[var(--surface-control)] border border-[var(--login-border-soft)] flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <div>
              <h4 className="text-[var(--text)] text-sm font-semibold mb-1">
                Sub-second Spinup
              </h4>
              <p className="text-[var(--login-muted)] text-xs leading-relaxed">
                Warm pre-provisioned Linux kernels resume in &lt;350ms globally.
              </p>
            </div>
          </div>

          {/* System Footer Links */}
          <div className="flex items-center justify-between text-xs text-[var(--login-text-subtle)] font-mono px-2">
            <span>© Devpulse Cloud Inc.</span>
            <div className="flex gap-4">
              <button
                onClick={() => void handleDevBypass("github")}
                className="hover:text-[var(--text-secondary)] transition-colors"
              >
                Privacy
              </button>
              <span>/</span>
              <button
                onClick={() => void handleDevBypass("github")}
                className="hover:text-[var(--text-secondary)] transition-colors"
              >
                Terms
              </button>
              <span>/</span>
              <button
                onClick={() => void handleDevBypass("github")}
                className="hover:text-[var(--text-secondary)] transition-colors"
              >
                System
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
