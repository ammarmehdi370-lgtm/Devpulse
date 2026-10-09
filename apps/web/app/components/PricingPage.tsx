"use client";

import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import {
  Check,
  ArrowRight,
  Zap,
  ShieldCheck,
  Lock,
  Globe,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Users,
  SlidersHorizontal,
} from "lucide-react";
import { FriendlyHint, HelpfulInfo, friendlyAlert } from "./FriendlyHelpers";

export const PricingPage: React.FC = () => {
  const { theme, billingCycle, setBillingCycle, setPage } = useApp();

  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: "Can I upgrade or downgrade between plans at any time?",
      a: "Yes. Upgrades take effect immediately with prorated billing. Downgrades apply at the start of your next billing cycle with zero penalty.",
    },
    {
      q: "Does Devpulse train AI models on my proprietary code?",
      a: "Never. Across all plans, including Free and Pro, Devpulse maintains strict zero-data agreements with AI model providers. Your codebase is never ingested for model fine-tuning.",
    },
    {
      q: "What happens when I hit my monthly AI inference limit?",
      a: "Never hit hard limits. Free plans throttle to standard queue. Pro and Enterprise include auto-recharge at wholesale rates ($0.002 per request) or allow bringing your own OpenAI / Anthropic API keys.",
    },
    {
      q: "How do custom VPC and on-premise Enterprise setups work?",
      a: "Enterprise plans support dedicated VPC peerings on AWS, GCP, or Azure, or full air-gapped on-premise Kubernetes cluster installations managed by our engineering staff.",
    },
  ];

  const proPrice = billingCycle === "annual" ? 15 : 19;
  const enterprisePrice = billingCycle === "annual" ? 39 : 49;

  return (
    <div className="p-6 sm:p-10 max-w-[1240px] mx-auto space-y-12 font-sans select-none">
      {/* Top Hero Banner (Pixel-Perfect to Screenshot 4) */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <FriendlyHint
          title="Choose the right plan"
          body="These plans control how much workspace power, AI help, and team access you get. You can start small and upgrade later when needed."
        />
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ide-accent/10 border border-ide-accent/30 text-[var(--ide-color-accent-readable)] text-[11px] font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-ide-accent animate-pulse" />
          <span>TRANSPARENT CLOUD DEVBOX TIERS</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-ide-text-strong tracking-tight">
          Simple, honest pricing
        </h1>
        <p className="text-sm sm:text-base text-ide-text-tertiary">
          Start free. Scale as you grow.
        </p>

        {/* Monthly vs Annual Toggle (with Save 20% badge) */}
        <div className="pt-3 flex items-center justify-center">
          <div className="bg-ide-surface p-1 rounded-2xl border border-ide-border-strong flex items-center gap-1 shadow-lg">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                billingCycle === "monthly"
                  ? "bg-ide-surface-raised text-ide-text-strong shadow"
                  : "text-ide-text-quiet hover:text-ide-text-strong"
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                billingCycle === "annual"
                  ? "bg-ide-surface-raised text-ide-text-strong shadow"
                  : "text-ide-text-quiet hover:text-ide-text-strong"
              }`}
            >
              <span>Annual: Save 20%</span>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono bg-ide-accent/20 text-[var(--ide-color-accent-readable)] font-bold">
                SAVE 20%
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 3 Pricing Tier Cards Grid (Pixel-Perfect to Screenshot 4) */}
      <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 2xl:grid-cols-4">
        {/* Tier 1: Free */}
        <div className="bg-ide-surface border border-ide-border-strong rounded-3xl p-7 flex flex-col justify-between shadow-xl space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-[11px] font-mono text-ide-text-dim">
              <span>TIER / 01</span>
              <span>OPTION 01</span>
            </div>

            <div>
              <h3 className="text-xl font-bold text-ide-text-strong">Free</h3>
              <p className="text-xs text-ide-text-quiet mt-0.5">
                Perfect for side projects
              </p>
            </div>

            <div className="pt-2">
              <span className="text-4xl font-extrabold text-ide-text-strong font-mono">
                $0
              </span>
              <span className="text-xs text-ide-text-quiet font-mono ml-2">
                / month
              </span>
              <div className="text-[11px] text-[var(--ide-color-accent-readable)] font-mono mt-1">
                Free forever · No card required
              </div>
            </div>

            {/* Features list */}
            <div className="space-y-3 pt-4 border-t border-ide-border-strong text-xs text-ide-text-secondary">
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-ide-accent" />
                <span>1 workspace</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-ide-accent" />
                <span>Basic editor</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-ide-accent" />
                <span>100 AI requests/month</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-ide-accent" />
                <span>Community support</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setPage("workspaces")}
            className="w-full py-3 px-4 rounded-xl bg-ide-surface-raised hover:bg-ide-surface-hover border border-ide-modal-border text-ide-text-strong font-semibold text-xs transition-colors flex items-center justify-center gap-2"
          >
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4 text-ide-muted" />
          </button>
        </div>

        {/* Tier 2: Pro (Most Popular) */}
        <div
          className="bg-ide-surface border-2 rounded-3xl p-7 flex flex-col justify-between shadow-2xl space-y-6 relative overflow-hidden"
          style={{ borderColor: theme.primary }}
        >
          {/* Top highlight ribbon */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-ide-text-tertiary">TIER / 02</span>
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-ide-accent-fg"
                style={{ backgroundColor: theme.primary }}
              >
                MOST POPULAR
              </span>
            </div>

            <div>
              <h3 className="text-xl font-bold text-ide-text-strong">Pro</h3>
              <p className="text-xs text-ide-text-tertiary mt-0.5">
                For active developers & fast moving small teams scaling
                micro-services.
              </p>
            </div>

            <div className="pt-2">
              <span className="text-4xl font-extrabold text-ide-text-strong font-mono">
                ${proPrice}
              </span>
              <span className="text-xs text-ide-text-tertiary font-mono ml-2">
                / month
              </span>
              <div className="text-[11px] text-[var(--ide-color-accent-readable)] font-mono mt-1">
                {billingCycle === "annual"
                  ? "Billed annually ($180/yr)"
                  : "Billed monthly · Cancel anytime"}
              </div>
            </div>

            {/* Features list */}
            <div className="space-y-3 pt-4 border-t border-ide-border-strong text-xs text-ide-text-strong">
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-ide-accent" />
                <strong className="font-semibold">Unlimited workspaces</strong>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-ide-accent" />
                <span>Full AI assistant</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-ide-accent" />
                <span>Remote code control</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-ide-accent" />
                <span>Team chat (10 members)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-ide-accent" />
                <span>Cloud sync 50GB</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-ide-accent" />
                <span>Priority support</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setPage("payment-methods")}
            className="w-full py-3.5 px-4 rounded-xl font-bold text-xs text-ide-accent-fg shadow-xl flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-98"
            style={{ backgroundColor: theme.primary }}
          >
            <Zap className="w-4 h-4 fill-current text-ide-accent-fg" />
            <span>Start Free Trial ⚡</span>
          </button>
        </div>

        {/* Customizable plan */}
        <div className="relative flex flex-col justify-between space-y-6 overflow-hidden rounded-3xl border border-ide-accent/30 bg-ide-surface-raised p-7 shadow-xl">
          <div className="space-y-5">
            <div className="flex items-center justify-between text-[11px] font-mono text-ide-text-soft">
              <span>FLEXIBLE / 04</span>
              <span className="rounded-full border border-ide-accent/25 bg-ide-accent/10 px-2.5 py-1 text-[9px] font-bold text-[var(--ide-color-accent-readable)]">
                YOUR TOOLKIT
              </span>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-ide-accent/25 bg-ide-accent/10 text-ide-accent">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-ide-text-strong">
                Customizable plan
              </h3>
              <p className="mt-1 text-xs leading-5 text-ide-text-soft">
                Only pay for the tools your workflow needs. Build a plan one
                feature at a time.
              </p>
            </div>
            <div className="border-t border-ide-success pt-4">
              <div className="font-mono text-3xl font-bold text-ide-text-strong">
                Your mix
              </div>
              <p className="mt-1 text-[11px] leading-5 text-ide-text-soft">
                Choose AI Assistant, Pulse Pilot, Team Chat, workspaces, and
                more.
              </p>
            </div>
          </div>
          <button
            onClick={() => setPage("custom-plan")}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-ide-accent/40 bg-ide-accent px-4 py-3 text-xs font-bold text-ide-accent-fg transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ide-surface-raised"
          >
            <span>Build your plan</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* Tier 3: Enterprise */}
        <div className="bg-ide-surface border border-ide-border-strong rounded-3xl p-7 flex flex-col justify-between shadow-xl space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-[11px] font-mono text-ide-text-dim">
              <span>TIER / 03</span>
              <span className="text-ide-warm-accent">CUSTOMISABLE</span>
            </div>

            <div>
              <h3 className="text-xl font-bold text-ide-text-strong">Enterprise</h3>
              <p className="text-xs text-ide-text-quiet mt-0.5">
                For scaling engineering orgs needing custom isolation & strict
                compliance.
              </p>
            </div>

            <div className="pt-2">
              <span className="text-4xl font-extrabold text-ide-text-strong font-mono">
                ${enterprisePrice}
              </span>
              <span className="text-xs text-ide-text-quiet font-mono ml-2">
                / user / month
              </span>
              <div className="text-[11px] text-ide-text-tertiary font-mono mt-1">
                Annual contract · 10 user min
              </div>
            </div>

            {/* Features list */}
            <div className="space-y-3 pt-4 border-t border-ide-border-strong text-xs text-ide-text-secondary">
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-ide-accent" />
                <strong className="font-semibold text-ide-text-strong">
                  Everything in Pro
                </strong>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-ide-accent" />
                <span>Private AI model</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-ide-accent" />
                <span>Unlimited team members</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-ide-accent" />
                <span>SSO + security audit</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-ide-accent" />
                <span>Analytics dashboard</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-ide-accent" />
                <span>Dedicated support</span>
              </div>
            </div>
          </div>

          <button
            onClick={() =>
              void friendlyAlert("Contacting Devpulse Enterprise engineering sales team.")
            }
            className="w-full py-3 px-4 rounded-xl bg-ide-surface-raised hover:bg-ide-surface-hover border border-ide-modal-border text-ide-text-strong font-semibold text-xs transition-colors flex items-center justify-center gap-2"
          >
            <span>Contact Sales</span>
          </button>
        </div>
      </div>

      {/* Security & Zero-Trust Strip (Pixel-Perfect to Screenshot 4) */}
      <div className="bg-ide-surface border border-ide-border-strong rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="max-w-2xl">
          <div className="text-[10px] font-mono text-[var(--ide-color-accent-readable)] uppercase tracking-wider mb-1">
            SECURITY & ISOLATION FIRST
          </div>
          <h3 className="text-xl font-bold text-ide-text-strong tracking-tight">
            Engineered for Zero-Trust Codebases
          </h3>
          <p className="text-xs text-ide-text-tertiary mt-1 leading-relaxed">
            Compile-time enforced multi-tenant memory fencing with
            hardware-level microVM isolation. Your code never leaves your
            safeguard-compliant boundaries.
          </p>
        </div>

        {/* 4 Security Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-ide-surface border border-ide-border-strong text-center space-y-1">
            <ShieldCheck className="w-6 h-6 text-ide-accent mx-auto" />
            <div className="text-xs font-bold text-ide-text-strong">SOC2</div>
            <div className="text-[10px] text-ide-text-dim font-mono">
              Type II (Oct 24-25)
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-ide-surface border border-ide-border-strong text-center space-y-1">
            <Lock className="w-6 h-6 text-ide-accent mx-auto" />
            <div className="text-xs font-bold text-ide-text-strong">HIPAA</div>
            <div className="text-[10px] text-ide-text-dim font-mono">
              HLS Ready
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-ide-surface border border-ide-border-strong text-center space-y-1">
            <Globe className="w-6 h-6 text-ide-secondary mx-auto" />
            <div className="text-xs font-bold text-ide-text-strong">ISO/IEC</div>
            <div className="text-[10px] text-ide-text-dim font-mono">
              27001:2022
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-ide-surface border border-ide-border-strong text-center space-y-1">
            <ShieldCheck className="w-6 h-6 text-ide-warm-accent mx-auto" />
            <div className="text-xs font-bold text-ide-text-strong">0-Retention</div>
            <div className="text-[10px] text-ide-text-dim font-mono">
              Code Not Stored
            </div>
          </div>
        </div>
      </div>

      {/* Frequently Asked Questions Accordion (Pixel-Perfect to Screenshot 4) */}
      <div className="space-y-4 max-w-3xl mx-auto">
        <div className="text-center space-y-1 pb-2">
          <div className="text-[10px] font-mono text-ide-text-dim uppercase tracking-wider">
            TRANSPARENCY & PEACE OF MIND
          </div>
          <h3 className="text-xl font-bold text-ide-text-strong">
            Frequently Asked Questions
          </h3>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="bg-ide-surface border border-ide-border-strong rounded-2xl overflow-hidden transition-all shadow-md"
            >
              <button
                onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                className="w-full p-4 text-left flex items-center justify-between gap-4 text-xs font-semibold text-ide-text-strong hover:text-[var(--ide-color-accent-readable)] transition-colors"
              >
                <span>{faq.q}</span>
                {expandedFaq === i ? (
                  <ChevronUp className="w-4 h-4 text-ide-muted" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-ide-muted" />
                )}
              </button>

              {expandedFaq === i && (
                <div className="px-4 pb-4 text-xs text-ide-text-tertiary leading-relaxed border-t border-ide-border-strong pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA Banner (Pixel-Perfect to Screenshot 4) */}
      <div className="bg-ide-surface border border-ide-border-strong rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-1 text-center md:text-left">
          <h3 className="text-xl font-extrabold text-ide-text-strong">
            Ready to accelerate your engineering workflow?
          </h3>
          <p className="text-xs text-ide-text-tertiary">
            Start building in your cloud workspace in under 10 seconds.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setPage("workspaces")}
            className="px-5 py-2.5 rounded-xl font-bold text-xs text-ide-accent-fg shadow-lg hover:brightness-110 active:scale-95 transition-all"
            style={{ backgroundColor: theme.primary }}
          >
            Create Free Account
          </button>
          <button
            onClick={() => void friendlyAlert("Opening engineering conversation channel.")}
            className="px-4 py-2.5 rounded-xl bg-ide-surface-raised hover:bg-ide-surface-hover border border-ide-modal-border text-ide-text-strong text-xs font-semibold transition-colors"
          >
            Talk with Engineering
          </button>
        </div>
      </div>
    </div>
  );
};
