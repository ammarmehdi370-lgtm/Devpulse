"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  Check,
  CircleAlert,
  Github,
  GitBranch,
  KeyRound,
  Link2,
  Mail,
  ShieldCheck,
  UserRoundPlus,
} from "lucide-react";
import { useApp } from "../context/AppContext";

const accountProviders = [
  {
    id: "google",
    name: "Google",
    description: "Use a Google identity for workspace access.",
    icon: "G",
    style: "provider-google",
  },
  {
    id: "github",
    name: "GitHub",
    description: "Link a GitHub profile and repositories.",
    Icon: Github,
    style: "provider-github",
  },
  {
    id: "gitlab",
    name: "GitLab",
    description: "Connect your GitLab account and projects.",
    Icon: GitBranch,
    style: "provider-gitlab",
  },
  {
    id: "microsoft",
    name: "Microsoft",
    description: "Use your Microsoft work or personal identity.",
    Icon: Building2,
    style: "provider-microsoft",
  },
  {
    id: "sso",
    name: "Company SSO",
    description: "Connect through your organization's identity provider.",
    Icon: KeyRound,
    style: "provider-sso",
  },
  {
    id: "email",
    name: "Email address",
    description: "Add another email with a secure sign-in link.",
    Icon: Mail,
    style: "provider-email",
  },
] as const;

export const AccountConnectionsPage: React.FC = () => {
  const { user, setPage } = useApp();
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  return (
    <div className="min-h-full bg-[#08080d] px-4 py-6 text-[#e8e8f1] sm:px-7 sm:py-8 lg:px-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <button
          type="button"
          onClick={() => setPage("settings")}
          className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-[#9293a5] transition hover:bg-white/[0.04] hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to settings
        </button>

        <header className="relative overflow-hidden rounded-3xl border border-white/[0.09] bg-gradient-to-br from-[#181821] via-[#111118] to-[#0d0d14] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.055)] sm:p-8">
          <div className="pointer-events-none absolute -right-10 -top-24 h-64 w-64 rounded-full bg-[#0DF5C4]/[0.07] blur-3xl" />
          <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#0DF5C4]/20 bg-[#0DF5C4]/[0.08] text-[#0DF5C4] shadow-[0_8px_24px_rgba(13,245,196,0.12)]">
                <UserRoundPlus className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0DF5C4]">
                  Identity & access
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Add an account
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-[#9797aa]">
                  Link another sign-in method to keep your Devpulse access
                  together in one place.
                </p>
              </div>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-300/20 bg-amber-200/[0.06] px-3 py-1.5 text-[10px] font-medium text-amber-100">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
              Preview · provider linking unavailable
            </span>
          </div>
        </header>

        <section className="account-connect-current">
          <div className="flex min-w-0 items-center gap-3">
            <span className="topbar-avatar h-11 w-11 text-sm">
              {user.name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#808194]">
                Signed in as
              </span>
              <strong className="mt-1 block truncate text-sm text-white">
                {user.name}
              </strong>
              <span className="mt-0.5 block truncate text-xs text-[#9293a5]">
                {user.email}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[#0DF5C4]/15 bg-[#0DF5C4]/[0.055] px-3 py-1.5 text-[10px] text-[#71dac5]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Primary account
          </div>
        </section>

        {selectedProvider && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-2xl border border-amber-300/20 bg-amber-200/[0.055] px-4 py-3.5 text-xs leading-5 text-amber-100"
          >
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <span>
              <strong className="font-semibold">
                {accountProviders.find(
                  (provider) => provider.id === selectedProvider,
                )?.name}{" "}
                linking is not configured.
              </strong>{" "}
              This preview does not connect external accounts. Provider
              credentials and a secure OAuth linking endpoint must be configured
              before connections can be enabled.
            </span>
          </div>
        )}

        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Choose a provider
            </h2>
            <p className="mt-1 text-xs text-[#828397]">
              Select an identity provider to preview its connection flow.
            </p>
          </div>
          <span className="text-[10px] text-[#6f7083]">
            {accountProviders.length} providers
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {accountProviders.map((provider) => {
            const Icon = "Icon" in provider ? provider.Icon : null;
            const letter = "icon" in provider ? provider.icon : null;
            const isSelected = selectedProvider === provider.id;
            return (
              <article
                key={provider.id}
                className={`account-provider-card ${isSelected ? "account-provider-card-selected" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={`account-provider-icon ${provider.style}`}>
                    {Icon ? (
                      <Icon className="h-5 w-5" />
                    ) : (
                      <span aria-hidden="true">{letter}</span>
                    )}
                  </span>
                  <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-2 py-1 text-[9px] font-medium uppercase tracking-[0.1em] text-[#85869a]">
                    Preview
                  </span>
                </div>
                <h3 className="mt-4 text-sm font-semibold text-white">
                  {provider.name}
                </h3>
                <p className="mt-1.5 min-h-10 text-[11px] leading-5 text-[#85869a]">
                  {provider.description}
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedProvider(provider.id)}
                  aria-label={`Preview connect ${provider.name}`}
                  className="mt-4 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 text-[11px] font-semibold text-[#d1d1dd] transition hover:border-[#0DF5C4]/25 hover:bg-[#0DF5C4]/[0.055] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0DF5C4]/60"
                >
                  {isSelected ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-[#0DF5C4]" />
                      Preview selected
                    </>
                  ) : (
                    <>
                      Preview connection
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </article>
            );
          })}
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3.5 text-[11px] leading-5 text-[#85869a]">
          <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-[#aaa5ff]" />
          <p>
            Account linking is a preview only. No provider is connected, no
            credentials are requested, and no authorization data is stored.
          </p>
        </div>
      </div>
    </div>
  );
};
