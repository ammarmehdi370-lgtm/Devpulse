"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import {
  Terminal,
  KeyRound,
  Mail,
  ArrowRight,
  Layers,
  Loader2,
  Cloud,
  Code2,
  GitBranch,
} from "lucide-react";
import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .email("Enter a valid work email address.");

export const LoginPage: React.FC = () => {
  const { login } = useApp();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState("");
  const [authError, setAuthError] = useState("");
  const [emailError, setEmailError] = useState("");

  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get("auth_error");
    if (error) {
      setAuthError(error);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleLogin = async (provider: string) => {
    setIsLoading(true);
    setLoginMethod(provider);
    setAuthError("");

    if (
      provider === "google" ||
      provider === "github" ||
      provider === "gitlab" ||
      provider === "sso"
    ) {
      // ── DEV BYPASS ────────────────────────────────────────────────────────
      // In development, skip the real OAuth redirect and log in immediately
      // with a mock dev user so you can test the full app flow locally.
      if (provider !== "google" && process.env.NODE_ENV === "development") {
        const providerLabels: Record<string, string> = {
          github: "GitHub Dev",
          gitlab: "GitLab Dev",
          sso: "SSO Dev",
        };
        const devName = providerLabels[provider] ?? "Dev User";
        const devEmail = `dev-${provider}@localhost.dev`;
        login(devEmail, devName);
        return;
      }
      // ── END DEV BYPASS ────────────────────────────────────────────────────
      window.location.href = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/v1/auth/${provider}/start`;
      return;
    }

    if (provider === "email") {
      const parsedEmail = emailSchema.safeParse(email);
      if (!parsedEmail.success) {
        setEmailError(
          parsedEmail.error.issues[0]?.message || "Enter a valid email.",
        );
        setIsLoading(false);
        return;
      }
      setEmailError("");
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/v1/auth/magic-link`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ email: parsedEmail.data }),
          },
        );
        const result = (await response.json()) as {
          verificationToken?: string;
          error?: string;
        };
        if (!response.ok)
          throw new Error(result.error || "Unable to request magic link");
        if (!result.verificationToken) return;
        const verifyResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/v1/auth/magic-link/verify`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ token: result.verificationToken }),
          },
        );
        const verified = (await verifyResponse.json()) as {
          user?: { email: string; name?: string };
          error?: string;
        };
        if (!verifyResponse.ok || !verified.user)
          throw new Error(verified.error || "Unable to verify magic link");
        login(verified.user.email, verified.user.name || "Devpulse User");
      } catch (error) {
        setAuthError(
          error instanceof Error
            ? error.message
            : "Unable to sign in. Please try again.",
        );
        setIsLoading(false);
      }
      return;
    }
    login(email || "alex@devpulse.dev", "Alex");
  };

  return (
    <main className="min-h-screen w-full bg-[#080d0d] bg-grid-pattern px-4 py-6 text-white sm:px-8 sm:py-10 font-sans">
      <div className="mx-auto grid min-h-[min(820px,calc(100vh-3rem))] w-full max-w-[1120px] overflow-hidden rounded-xl border border-[#263130] bg-[#0d1313] shadow-2xl shadow-black/40 lg:grid-cols-[0.92fr_1.08fr]">
        <section className="flex flex-col justify-center px-6 py-8 sm:px-10 lg:px-12 lg:py-12">
          <div className="mb-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0df5c4] text-[#071110]">
                <Layers className="h-5 w-5" aria-hidden="true" />
              </div>
              <span className="text-xl font-semibold tracking-tight">
                Devpulse
              </span>
            </div>
            <span className="rounded-md border border-[#2a3836] bg-[#121c1b] px-2.5 py-1.5 font-mono text-[10px] text-[#9fb1ae]">
              CLOUD WORKSPACE
            </span>
          </div>

          <div className="mb-7">
            <h1 className="mb-2 text-3xl font-semibold leading-tight sm:text-4xl">
              Welcome back
            </h1>
            <p className="text-sm leading-6 text-[#9aa9a7]">
              Sign in to continue to your projects and workspaces.
            </p>
          </div>

          {authError && (
            <div
              className="mb-5 rounded-lg border border-[#f87171]/40 bg-[#f87171]/10 px-4 py-3 text-sm text-[#fca5a5]"
              role="alert"
            >
              {authError}
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => handleLogin("google")}
              disabled={isLoading}
              className="flex min-h-12 w-full items-center justify-center gap-3 rounded-lg bg-[#f7f9f8] px-4 text-sm font-semibold text-[#18201f] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0df5c4] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading && loginMethod === "google" ? (
                <Loader2 className="h-[18px] w-[18px] animate-spin" />
              ) : (
                <svg
                  className="h-[18px] w-[18px]"
                  viewBox="0 0 48 48"
                  role="img"
                  aria-label="Google"
                >
                  <path
                    fill="#4285F4"
                    d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M12.6 27.7a12 12 0 0 1 0-7.4V15H5.8a20 20 0 0 0 0 18l6.8-5.3Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M24 11.9c3 0 5.7 1 7.8 3.1l5.9-5.9C34.1 5.8 29.5 4 24 4A20 20 0 0 0 5.8 15l6.8 5.3c1.6-4.8 6.1-8.4 11.4-8.4Z"
                  />
                </svg>
              )}
              <span>
                {isLoading && loginMethod === "google"
                  ? "Connecting to Google..."
                  : "Continue with Google"}
              </span>
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleLogin("github")}
                disabled={isLoading}
                className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#33403e] bg-[#131a19] px-3 text-sm font-medium text-[#e2e8e7] transition-colors hover:border-[#52625f] hover:bg-[#192220] disabled:opacity-60"
              >
                <svg
                  className="h-4 w-4 fill-current"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.71.5.1.68-.22.68-.49v-1.72c-2.78.62-3.37-1.22-3.37-1.22-.45-1.19-1.11-1.51-1.11-1.51-.91-.64.07-.63.07-.63 1 .07 1.53 1.05 1.53 1.05.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.64-1.36-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.04a9.3 9.3 0 0 1 5.01 0c1.91-1.32 2.75-1.04 2.75-1.04.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.05.36.32.68.94.68 1.9v2.65c0 .27.18.59.69.49A10.25 10.25 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z" />
                </svg>
                <span>
                  {isLoading && loginMethod === "github"
                    ? "Connecting..."
                    : "GitHub"}
                </span>
              </button>
              <button
                onClick={() => handleLogin("gitlab")}
                disabled={isLoading}
                className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#33403e] bg-[#131a19] px-3 text-sm font-medium text-[#e2e8e7] transition-colors hover:border-[#52625f] hover:bg-[#192220] disabled:opacity-60"
              >
                <svg
                  className="h-4 w-4 text-[#fc6d26]"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="m23.6 9.57-.03-.08-3.48-8.87a.89.89 0 0 0-1.68 0L15.35 8H8.65L5.59.62a.89.89 0 0 0-1.68 0L.43 9.49l-.03.08a5.9 5.9 0 0 0 2.08 6.74L12 23.4l9.52-7.09a5.9 5.9 0 0 0 2.08-6.74Z" />
                </svg>
                <span>
                  {isLoading && loginMethod === "gitlab"
                    ? "Connecting..."
                    : "GitLab"}
                </span>
              </button>
            </div>

            <button
              onClick={() => handleLogin("sso")}
              disabled={isLoading}
              className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg px-3 text-sm text-[#a6b2b0] transition-colors hover:bg-[#141d1c] hover:text-white disabled:opacity-60"
            >
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              <span>
                {isLoading && loginMethod === "sso"
                  ? "Connecting..."
                  : "Sign in with SSO"}
              </span>
            </button>
          </div>

          <div className="my-6 flex items-center gap-3" aria-hidden="true">
            <div className="h-px flex-1 bg-[#293331]" />
            <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#74817f]">
              or use work email
            </span>
            <div className="h-px flex-1 bg-[#293331]" />
          </div>

          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void handleLogin("email");
            }}
          >
            <label
              htmlFor="work-email"
              className="block text-xs font-medium text-[#c5cfcd]"
            >
              Work email
            </label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71807d]"
                aria-hidden="true"
              />
              <input
                id="work-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@company.com"
                autoComplete="email"
                className="min-h-12 w-full rounded-lg border border-[#34403e] bg-[#0a1010] pl-10 pr-3 text-sm text-white placeholder:text-[#61706d] focus:border-[#0df5c4] focus:outline-none focus:ring-2 focus:ring-[#0df5c4]/15"
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? "email-error" : undefined}
              />
            </div>
            {emailError && (
              <p
                id="email-error"
                className="text-xs text-[#fca5a5]"
                role="alert"
              >
                {emailError}
              </p>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="group flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#0df5c4] px-4 text-sm font-semibold text-[#071110] transition-colors hover:bg-[#39f8d0] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span>
                {isLoading && loginMethod === "email"
                  ? "Sending link..."
                  : "Get sign-in link"}
              </span>
              {isLoading && loginMethod === "email" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-[11px] leading-5 text-[#71807d]">
            By continuing, you agree to our{" "}
            <a
              href="/terms"
              className="text-[#b7c5c2] underline underline-offset-2 hover:text-white"
            >
              Terms
            </a>{" "}
            and{" "}
            <a
              href="/privacy"
              className="text-[#b7c5c2] underline underline-offset-2 hover:text-white"
            >
              Privacy Policy
            </a>
            .
          </p>
        </section>

        <aside className="relative hidden flex-col justify-between overflow-hidden border-l border-[#263130] bg-[#101817] p-8 lg:flex xl:p-10">
          <div>
            <div className="mb-8 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-[#8da19d]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0df5c4]" />
              Development workspace
            </div>
            <h2 className="max-w-md text-3xl font-semibold leading-tight text-[#f3f7f6]">
              Pick up where your next idea begins.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-6 text-[#96a5a2]">
              Your repositories, cloud environments, and everyday development
              tools in one workspace.
            </p>
          </div>

          <div className="my-10 overflow-hidden rounded-lg border border-[#2d3a38] bg-[#0b1110] shadow-xl shadow-black/20">
            <div className="flex h-11 items-center justify-between border-b border-[#26312f] px-4">
              <div className="flex items-center gap-2 text-xs text-[#b2bfbd]">
                <Terminal
                  className="h-3.5 w-3.5 text-[#0df5c4]"
                  aria-hidden="true"
                />
                devpulse-core
              </div>
              <span className="rounded border border-[#34413f] px-2 py-0.5 font-mono text-[10px] text-[#94a29f]">
                main
              </span>
            </div>
            <div className="grid grid-cols-[112px_1fr]">
              <div className="space-y-3 border-r border-[#26312f] p-3 text-[10px] text-[#82918e]">
                <div className="flex items-center gap-2 text-[#d0d9d7]">
                  <Cloud className="h-3.5 w-3.5 text-[#0df5c4]" /> Workspaces
                </div>
                <div className="flex items-center gap-2">
                  <GitBranch className="h-3.5 w-3.5" /> Repositories
                </div>
                <div className="flex items-center gap-2">
                  <Code2 className="h-3.5 w-3.5" /> Editor
                </div>
              </div>
              <div className="overflow-hidden p-4 font-mono text-[11px] leading-6">
                <div className="mb-2 text-[#71807d]">src / index.ts</div>
                <div>
                  <span className="mr-4 text-[#5b6966]">01</span>
                  <span className="text-[#91a7ff]">
                    export async function
                  </span>{" "}
                  <span className="text-[#f4d58d]">startRuntime</span>() {"{"}
                </div>
                <div>
                  <span className="mr-4 text-[#5b6966]">02</span>{" "}
                  <span className="text-[#91a7ff]">const</span> workspace ={" "}
                  <span className="text-[#a7d9c2]">await</span> connect();
                </div>
                <div>
                  <span className="mr-4 text-[#5b6966]">03</span>{" "}
                  <span className="text-[#b4c1bf]">return</span>{" "}
                  workspace.ready;
                </div>
                <div>
                  <span className="mr-4 text-[#5b6966]">04</span>
                  {"}"}
                </div>
                <div className="mt-3 h-px w-full bg-[#26312f]" />
                <div className="mt-3 flex items-center gap-2 text-[#869591]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0df5c4]" />
                  Ready for your next session
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 border-t border-[#293532] pt-5 text-[11px] text-[#84928f]">
            <div>
              <span className="mb-1 block text-[#e0e8e6]">Workspaces</span>Cloud
              environments
            </div>
            <div>
              <span className="mb-1 block text-[#e0e8e6]">Projects</span>
              Repository context
            </div>
            <div>
              <span className="mb-1 block text-[#e0e8e6]">Tooling</span>Code and
              releases
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
};
