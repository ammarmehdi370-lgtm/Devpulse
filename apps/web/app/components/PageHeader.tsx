import React from "react";
import type { PageType } from "../context/AppContext";

export type PageHeaderKey = PageType | "activity" | "settings";

export const PAGE_META: Record<
  PageHeaderKey,
  { title: string; subtitle: string }
> = {
  workspaces: {
    title: "Cloud Workspaces",
    subtitle: "Manage your dev environments",
  },
  repositories: {
    title: "Code Projects",
    subtitle: "Your repositories and projects",
  },
  editor: {
    title: "Maestro Code Studio",
    subtitle: "Browser-native code editor",
  },
  deployments: {
    title: "Live Releases & Health",
    subtitle: "Deployments and operations",
  },
  chat: {
    title: "Team Chat",
    subtitle: "Channels and direct messages",
  },
  "ai-studio": {
    title: "AI Assistant",
    subtitle: "Full-screen AI workspace",
  },
  "remote-control": {
    title: "Pulse Pilot",
    subtitle: "Remote collaboration",
  },
  pricing: {
    title: "Plans & Billing",
    subtitle: "Choose the right plan",
  },
  activity: {
    title: "Your Activity",
    subtitle: "Timeline and events",
  },
  settings: {
    title: "Site Settings",
    subtitle: "Preferences and account",
  },
  login: {
    title: "Sign in to Devpulse",
    subtitle: "Access your development workspace",
  },
  theme: {
    title: "Choose your theme",
    subtitle: "Personalize your Devpulse workspace",
  },
};

export function PageHeader({ page }: { page: PageHeaderKey }) {
  const { title, subtitle } = PAGE_META[page];
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-bold text-[var(--text)]">{title}</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>
    </header>
  );
}
