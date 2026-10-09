"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  Check,
  Code2,
  Copy,
  Headset,
  MessageSquare,
  Monitor,
  Server,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import { useApp } from "../context/AppContext";

const planFeatures = [
  {
    id: "workspaces",
    name: "Cloud Workspaces",
    description: "Managed devboxes for your projects",
    monthlyPrice: 10,
    annualPrice: 8,
    icon: Server,
    color: "text-ide-accent",
  },
  {
    id: "editor",
    name: "Code Editor",
    description: "Browser-based editor and terminal",
    monthlyPrice: 5,
    annualPrice: 4,
    icon: Code2,
    color: "text-ide-secondary",
  },
  {
    id: "ai-assistant",
    name: "AI Assistant",
    description: "Code-aware assistance and generation",
    monthlyPrice: 15,
    annualPrice: 12,
    icon: Sparkles,
    color: "text-ide-accent",
  },
  {
    id: "pulse-pilot",
    name: "Pulse Pilot",
    description: "Live pairing and remote code control",
    monthlyPrice: 10,
    annualPrice: 8,
    icon: Monitor,
    color: "text-ide-warm-accent",
  },
  {
    id: "team-chat",
    name: "Team Chat",
    description: "Channels, direct messages, and file sharing",
    monthlyPrice: 5,
    annualPrice: 4,
    icon: MessageSquare,
    color: "text-ide-secondary",
  },
  {
    id: "priority-support",
    name: "Priority Support",
    description: "Faster help from the Devpulse team",
    monthlyPrice: 5,
    annualPrice: 4,
    icon: Headset,
    color: "text-ide-warm-accent",
  },
] as const;

type FeatureId = (typeof planFeatures)[number]["id"];

export const CustomPlanPage: React.FC = () => {
  const { billingCycle, setBillingCycle, setPage, theme } = useApp();
  const [selectedFeatures, setSelectedFeatures] = useState<FeatureId[]>([]);
  const [copyStatus, setCopyStatus] = useState("");

  const selectedOptions = planFeatures.filter((feature) =>
    selectedFeatures.includes(feature.id),
  );
  const monthlyEstimate = selectedOptions.reduce(
    (total, feature) =>
      total +
      (billingCycle === "annual" ? feature.annualPrice : feature.monthlyPrice),
    0,
  );
  const annualTotal = monthlyEstimate * 12;

  const toggleFeature = (featureId: FeatureId) => {
    setCopyStatus("");
    setSelectedFeatures((current) =>
      current.includes(featureId)
        ? current.filter((id) => id !== featureId)
        : [...current, featureId],
    );
  };

  const copyPlanSummary = async () => {
    const billingLabel =
      billingCycle === "annual"
        ? `$${monthlyEstimate}/month equivalent, billed $${annualTotal}/year`
        : `$${monthlyEstimate}/month`;
    const summary = [
      "Devpulse customizable plan estimate",
      ...selectedOptions.map((feature) => `- ${feature.name}`),
      `Estimated total: ${billingLabel}`,
      "Estimate only; final pricing and availability to be confirmed.",
    ].join("\n");

    try {
      await navigator.clipboard.writeText(summary);
      setCopyStatus(
        "Plan summary copied. Share it with the Devpulse team to request a quote.",
      );
    } catch {
      setCopyStatus("Clipboard access is unavailable in this browser.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-7 p-4 font-sans sm:p-7 lg:p-9">
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => setPage("pricing")}
          className="inline-flex items-center gap-2 rounded-md text-xs font-medium text-ide-text-secondary transition hover:text-ide-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to plans
        </button>

        <div className="flex flex-col justify-between gap-5 border-b border-ide-border-strong pb-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-[var(--ide-color-accent-readable)]">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Build your own plan</span>
            </div>
            <h1 className="text-2xl font-bold text-ide-text-strong sm:text-3xl">
              Choose only what you need
            </h1>
            <p className="mt-2 text-sm leading-6 text-ide-text-body">
              Combine Devpulse tools around the way you work. Your estimate
              updates as you select features.
            </p>
          </div>

          <div
            className="inline-flex w-fit items-center gap-1 rounded-lg border border-ide-border-control bg-ide-surface-toolbar p-1"
            aria-label="Billing cycle"
          >
            <button
              type="button"
              aria-pressed={billingCycle === "monthly"}
              onClick={() => setBillingCycle("monthly")}
              className={`rounded-md px-3 py-2 text-xs font-medium transition ${billingCycle === "monthly" ? "bg-ide-surface-hover-strong text-ide-text-strong shadow-[0_1px_2px_color-mix(in_srgb,var(--ide-color-shadow-strong)_8%,transparent)]" : "text-ide-text-soft hover:text-ide-text-strong"}`}
            >
              Monthly
            </button>
            <button
              type="button"
              aria-pressed={billingCycle === "annual"}
              onClick={() => setBillingCycle("annual")}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition ${billingCycle === "annual" ? "bg-ide-surface-hover-strong text-ide-text-strong shadow-[0_1px_2px_color-mix(in_srgb,var(--ide-color-shadow-strong)_8%,transparent)]" : "text-ide-text-soft hover:text-ide-text-strong"}`}
            >
              Annual
              <span className="rounded-full bg-ide-accent/10 px-1.5 py-0.5 text-[9px] font-semibold text-[var(--ide-color-accent-readable)]">
                SAVE 20%
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="feature-heading">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2
                id="feature-heading"
                className="text-sm font-semibold text-ide-text-strong"
              >
                Select your features
              </h2>
              <p className="mt-1 text-xs text-ide-text-tertiary">
                Choose one or more. You can change this mix anytime.
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-ide-border-control bg-ide-surface-toolbar px-2.5 py-1 font-mono text-[10px] text-ide-text-body">
              {selectedFeatures.length} selected
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {planFeatures.map((feature) => {
              const isSelected = selectedFeatures.includes(feature.id);
              const Icon = feature.icon;
              const price =
                billingCycle === "annual"
                  ? feature.annualPrice
                  : feature.monthlyPrice;

              return (
                <button
                  key={feature.id}
                  type="button"
                  role="checkbox"
                  aria-checked={isSelected}
                  onClick={() => toggleFeature(feature.id)}
                  className={`group flex min-h-32 w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring ${isSelected ? "border-ide-accent/50 bg-ide-accent-soft" : "border-ide-border-control bg-ide-surface-toolbar hover:border-ide-border-strong hover:bg-ide-surface-raised"}`}
                >
                  <span
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ide-border-control bg-ide-surface-raised ${feature.color}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-ide-text-strong">
                        {feature.name}
                      </span>
                      <span className="shrink-0 font-mono text-xs text-ide-text">
                        ${price}
                        <span className="text-[10px] text-ide-text-tertiary">/mo</span>
                      </span>
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-ide-text-soft">
                      {feature.description}
                    </span>
                  </span>
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${isSelected ? "border-ide-accent text-ide-accent-fg" : "border-ide-border-strong text-transparent"}`}
                    style={
                      isSelected
                        ? { backgroundColor: theme.primary }
                        : undefined
                    }
                    aria-hidden="true"
                  >
                    <Check className="h-3 w-3" />
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="lg:sticky lg:top-5">
          <div className="overflow-hidden rounded-lg border border-ide-modal-border bg-ide-surface-toolbar">
            <div className="border-b border-ide-border-control px-5 py-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-ide-text-tertiary">
                Your estimate
              </div>
              <div className="mt-3 flex items-end gap-2">
                <span className="text-4xl font-bold tracking-tight text-ide-text-strong">
                  ${monthlyEstimate}
                </span>
                <span className="pb-1 text-xs text-ide-text-soft">/ month</span>
              </div>
              <p className="mt-1 text-[11px] text-ide-text-tertiary">
                {billingCycle === "annual"
                  ? `$${annualTotal} billed annually · 20% savings applied`
                  : "Billed monthly · no commitment"}
              </p>
            </div>

            <div className="space-y-4 p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xs font-semibold text-ide-text-strong">
                  Included features
                </h2>
                {selectedFeatures.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFeatures([]);
                      setCopyStatus("");
                    }}
                    className="text-[10px] text-ide-text-soft underline-offset-2 hover:text-ide-text-strong hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {selectedOptions.length > 0 ? (
                <ul className="space-y-3">
                  {selectedOptions.map((feature) => (
                    <li
                      key={feature.id}
                      className="flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="flex min-w-0 items-center gap-2 text-ide-text-secondary">
                        <Check className="h-3.5 w-3.5 shrink-0 text-ide-success" />
                        <span className="truncate">{feature.name}</span>
                      </span>
                      <span className="shrink-0 font-mono text-ide-text-body">
                        $
                        {billingCycle === "annual"
                          ? feature.annualPrice
                          : feature.monthlyPrice}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-md border border-dashed border-ide-modal-border px-3 py-4 text-center text-xs leading-5 text-ide-text-tertiary">
                  Select a feature to start building your plan.
                </p>
              )}

              <div className="border-t border-ide-border-control pt-4">
                <button
                  type="button"
                  onClick={copyPlanSummary}
                  disabled={selectedOptions.length === 0}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md px-4 text-xs font-semibold text-ide-accent-fg transition hover:brightness-110 disabled:cursor-not-allowed disabled:text-ide-text-strong"
                  style={{
                    backgroundColor:
                      selectedOptions.length > 0
                        ? theme.primary
                        : "var(--ide-color-accent-soft)",
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy plan summary
                </button>
                <p className="mt-3 text-center text-[10px] leading-4 text-ide-muted">
                  This is an estimate, not a purchase. Share the summary to
                  request a final quote.
                </p>
                {copyStatus && (
                  <p
                    role="status"
                    className="mt-3 text-center text-[11px] leading-5 text-[var(--ide-color-success-readable)]"
                  >
                    {copyStatus}
                  </p>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
