"use client";

import React from "react";
import { ArrowRight, Code2, Layers } from "lucide-react";
import { useApp } from "../context/AppContext";
import { ThemeMenu, ThemePreviewCard } from "./ThemeMenu";
import { LOGO_COLORS } from "../logoColors";

export const ThemePalettePage: React.FC = () => {
  const { theme, setPage, workspaces } = useApp();

  const continueToWorkspace = () => {
    setPage(workspaces.length > 0 ? "editor" : "workspaces");
  };

  return (
    <main className="flex h-dvh max-h-dvh min-h-0 w-full min-w-0 items-center justify-center overflow-hidden bg-ide-app-content-bg px-3 py-4 text-ide-text-strong sm:px-6">
      <section className="relative isolate flex max-h-[calc(100dvh-32px)] w-full min-w-0 max-w-6xl flex-col overflow-y-auto overflow-x-hidden rounded-[var(--ide-radius-xl)] border border-ide-border bg-[linear-gradient(145deg,color-mix(in_srgb,var(--ide-color-surface-raised)_82%,var(--ide-color-panel)),var(--ide-color-panel))] p-4 shadow-[0_18px_44px_var(--ide-color-shadow-card),0_36px_90px_var(--ide-color-shadow-strong),inset_0_1px_0_color-mix(in_srgb,var(--ide-color-text-strong)_14%,transparent)] sm:p-6 min-[900px]:overflow-visible [@media(max-height:640px)]:overflow-y-auto">
        <div className="pointer-events-none absolute inset-px -z-10 rounded-[calc(var(--ide-radius-xl)-1px)] border border-[color-mix(in_srgb,var(--ide-color-text-strong)_7%,transparent)]" />
        <div className="pointer-events-none absolute inset-0 -z-20 rounded-[var(--ide-radius-xl)] bg-[color-mix(in_srgb,var(--ide-color-accent)_9%,transparent)] blur-2xl" />
        <header className="mb-5 flex min-w-0 flex-col items-center text-center">
          <span
            className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-[var(--ide-radius-md)] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]"
            style={{
              backgroundColor: LOGO_COLORS.background,
              color: LOGO_COLORS.foreground,
              boxShadow: LOGO_COLORS.shadow,
            }}
          >
            <Layers className="h-4 w-4" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-ide-text-strong">
            Choose your workspace theme
          </h1>
          <p className="mx-auto mt-1 max-w-2xl text-sm leading-5 text-ide-muted">
            Choose from 12 built-in themes or import a VS Code theme. You can change it any time.
          </p>
        </header>

        <div className="grid min-h-0 min-w-0 grid-cols-1 items-start gap-5 min-[900px]:grid-cols-2 min-[900px]:gap-7">
          <div className="min-w-0">
            <h2 className="mb-2 text-[11px] font-semibold uppercase leading-4 tracking-[0.12em] text-ide-muted">
              Theme
            </h2>
            <ThemeMenu showDetails />
          </div>
          <div className="min-w-0">
            <h2 className="mb-2 text-[11px] font-semibold uppercase leading-4 tracking-[0.12em] text-ide-muted">
              Live preview
            </h2>
            <div className="aspect-[16/10] w-full min-w-0">
              <ThemePreviewCard theme={theme} compact className="h-full min-h-0" />
            </div>
          </div>
        </div>

        <div className="mt-5 flex min-w-0 flex-wrap items-center justify-end gap-2 border-t border-ide-border pt-4 sm:mt-6 sm:gap-3">
          <button
            type="button"
            onClick={() => setPage("workspaces")}
            className="inline-flex min-h-10 items-center gap-2 rounded-[var(--ide-radius-md)] border border-ide-border bg-ide-surface px-3.5 text-sm font-medium text-ide-text-strong transition-colors hover:bg-ide-surface-hover sm:px-4"
          >
            <Layers className="h-4 w-4" />
            Workspaces
          </button>
          <button
            type="button"
            onClick={() => setPage("editor")}
            className="inline-flex min-h-10 items-center gap-2 rounded-[var(--ide-radius-md)] border border-ide-border bg-ide-surface px-3.5 text-sm font-medium text-ide-text-strong transition-colors hover:bg-ide-surface-hover sm:px-4"
          >
            <Code2 className="h-4 w-4" />
            Code Editor
          </button>
          <button
            type="button"
            onClick={continueToWorkspace}
            className="inline-flex min-h-10 items-center gap-2 rounded-[var(--ide-radius-md)] bg-ide-accent px-4 text-sm font-semibold text-ide-accent-fg shadow-ide-shadow-card transition-all duration-200 hover:brightness-110 sm:px-5"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </main>
  );
};
