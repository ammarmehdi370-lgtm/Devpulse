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
  Cpu,
  Server,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Users,
} from "lucide-react";
import { FriendlyHint, HelpfulInfo } from "./FriendlyHelpers";

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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0DF5C4]/10 border border-[#0DF5C4]/30 text-[#0DF5C4] text-[11px] font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0DF5C4] animate-pulse" />
          <span>TRANSPARENT CLOUD DEVBOX TIERS</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
          Simple, honest pricing
        </h1>
        <p className="text-sm sm:text-base text-[#8c8ca5]">
          Start free. Scale as you grow.
        </p>

        {/* Monthly vs Annual Toggle (with Save 20% badge) */}
        <div className="pt-3 flex items-center justify-center">
          <div className="bg-[#12121c] p-1 rounded-2xl border border-[#232336] flex items-center gap-1 shadow-lg">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                billingCycle === "monthly"
                  ? "bg-[#1e1e2e] text-white shadow"
                  : "text-[#7e7e9a] hover:text-white"
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                billingCycle === "annual"
                  ? "bg-[#1e1e2e] text-white shadow"
                  : "text-[#7e7e9a] hover:text-white"
              }`}
            >
              <span>Annual: Save 20%</span>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono bg-[#0DF5C4]/20 text-[#0DF5C4] font-bold">
                SAVE 20%
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 3 Pricing Tier Cards Grid (Pixel-Perfect to Screenshot 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Tier 1: Free */}
        <div className="bg-[#111119] border border-[#20202e] rounded-3xl p-7 flex flex-col justify-between shadow-xl space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#6c6c88]">
              <span>TIER / 01</span>
              <span>OPTION 01</span>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">Free</h3>
              <p className="text-xs text-[#7e7e98] mt-0.5">
                Perfect for side projects
              </p>
            </div>

            <div className="pt-2">
              <span className="text-4xl font-extrabold text-white font-mono">
                $0
              </span>
              <span className="text-xs text-[#7e7e98] font-mono ml-2">
                / month
              </span>
              <div className="text-[11px] text-[#0DF5C4] font-mono mt-1">
                Free forever · No card required
              </div>
            </div>

            {/* Features list */}
            <div className="space-y-3 pt-4 border-t border-[#1d1d2c] text-xs text-[#c4c4dc]">
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#0DF5C4]" />
                <span>1 workspace</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#0DF5C4]" />
                <span>Basic editor</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#0DF5C4]" />
                <span>100 AI requests/month</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#0DF5C4]" />
                <span>Community support</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setPage("workspaces")}
            className="w-full py-3 px-4 rounded-xl bg-[#171724] hover:bg-[#202032] border border-[#2b2b40] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
          >
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4 text-[#787896]" />
          </button>
        </div>

        {/* Tier 2: Pro (Most Popular) */}
        <div
          className="bg-[#12121c] border-2 rounded-3xl p-7 flex flex-col justify-between shadow-2xl space-y-6 relative overflow-hidden"
          style={{ borderColor: theme.primary }}
        >
          {/* Top highlight ribbon */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-[#8c8ca8]">TIER / 02</span>
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-[#09090e]"
                style={{ backgroundColor: theme.primary }}
              >
                MOST POPULAR
              </span>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">Pro</h3>
              <p className="text-xs text-[#8e8ea6] mt-0.5">
                For active developers & fast moving small teams scaling
                micro-services.
              </p>
            </div>

            <div className="pt-2">
              <span className="text-4xl font-extrabold text-white font-mono">
                ${proPrice}
              </span>
              <span className="text-xs text-[#8e8ea6] font-mono ml-2">
                / month
              </span>
              <div className="text-[11px] text-[#0DF5C4] font-mono mt-1">
                {billingCycle === "annual"
                  ? "Billed annually ($180/yr)"
                  : "Billed monthly · Cancel anytime"}
              </div>
            </div>

            {/* Features list */}
            <div className="space-y-3 pt-4 border-t border-[#202034] text-xs text-white">
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#0DF5C4]" />
                <strong className="font-semibold">Unlimited workspaces</strong>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#0DF5C4]" />
                <span>Full AI assistant</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#0DF5C4]" />
                <span>Remote code control</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#0DF5C4]" />
                <span>Team chat (10 members)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#0DF5C4]" />
                <span>Cloud sync 50GB</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#0DF5C4]" />
                <span>Priority support</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setPage("editor")}
            className="w-full py-3.5 px-4 rounded-xl font-bold text-xs text-[#09090e] shadow-xl flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-98"
            style={{ backgroundColor: theme.primary }}
          >
            <Zap className="w-4 h-4 fill-current text-[#09090e]" />
            <span>Start Free Trial ⚡</span>
          </button>
        </div>

        {/* Tier 3: Enterprise */}
        <div className="bg-[#111119] border border-[#20202e] rounded-3xl p-7 flex flex-col justify-between shadow-xl space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#6c6c88]">
              <span>TIER / 03</span>
              <span className="text-[#FF9E64]">CUSTOMISABLE</span>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">Enterprise</h3>
              <p className="text-xs text-[#7e7e98] mt-0.5">
                For scaling engineering orgs needing custom isolation & strict
                compliance.
              </p>
            </div>

            <div className="pt-2">
              <span className="text-4xl font-extrabold text-white font-mono">
                ${enterprisePrice}
              </span>
              <span className="text-xs text-[#7e7e98] font-mono ml-2">
                / user / month
              </span>
              <div className="text-[11px] text-[#8e8ea6] font-mono mt-1">
                Annual contract · 10 user min
              </div>
            </div>

            {/* Features list */}
            <div className="space-y-3 pt-4 border-t border-[#1d1d2c] text-xs text-[#c4c4dc]">
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#0DF5C4]" />
                <strong className="font-semibold text-white">
                  Everything in Pro
                </strong>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#0DF5C4]" />
                <span>Private AI model</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#0DF5C4]" />
                <span>Unlimited team members</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#0DF5C4]" />
                <span>SSO + security audit</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#0DF5C4]" />
                <span>Analytics dashboard</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#0DF5C4]" />
                <span>Dedicated support</span>
              </div>
            </div>
          </div>

          <button
            onClick={() =>
              alert("Contacting Devpulse Enterprise engineering sales team.")
            }
            className="w-full py-3 px-4 rounded-xl bg-[#171724] hover:bg-[#202032] border border-[#2b2b40] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
          >
            <span>Contact Sales</span>
          </button>
        </div>
      </div>

      {/* Security & Zero-Trust Strip (Pixel-Perfect to Screenshot 4) */}
      <div className="bg-[#11111a] border border-[#20202e] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="max-w-2xl">
          <div className="text-[10px] font-mono text-[#0DF5C4] uppercase tracking-wider mb-1">
            SECURITY & ISOLATION FIRST
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">
            Engineered for Zero-Trust Codebases
          </h3>
          <p className="text-xs text-[#8c8ca5] mt-1 leading-relaxed">
            Compile-time enforced multi-tenant memory fencing with
            hardware-level microVM isolation. Your code never leaves your
            safeguard-compliant boundaries.
          </p>
        </div>

        {/* 4 Security Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-[#151522] border border-[#232336] text-center space-y-1">
            <ShieldCheck className="w-6 h-6 text-[#0DF5C4] mx-auto" />
            <div className="text-xs font-bold text-white">SOC2</div>
            <div className="text-[10px] text-[#71718c] font-mono">
              Type II (Oct 24-25)
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#151522] border border-[#232336] text-center space-y-1">
            <Lock className="w-6 h-6 text-[#0DF5C4] mx-auto" />
            <div className="text-xs font-bold text-white">HIPAA</div>
            <div className="text-[10px] text-[#71718c] font-mono">
              HLS Ready
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#151522] border border-[#232336] text-center space-y-1">
            <Globe className="w-6 h-6 text-[#6C63FF] mx-auto" />
            <div className="text-xs font-bold text-white">ISO/IEC</div>
            <div className="text-[10px] text-[#71718c] font-mono">
              27001:2022
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#151522] border border-[#232336] text-center space-y-1">
            <ShieldCheck className="w-6 h-6 text-[#FF9E64] mx-auto" />
            <div className="text-xs font-bold text-white">0-Retention</div>
            <div className="text-[10px] text-[#71718c] font-mono">
              Code Not Stored
            </div>
          </div>
        </div>
      </div>

      {/* Frequently Asked Questions Accordion (Pixel-Perfect to Screenshot 4) */}
      <div className="space-y-4 max-w-3xl mx-auto">
        <div className="text-center space-y-1 pb-2">
          <div className="text-[10px] font-mono text-[#6c6c88] uppercase tracking-wider">
            TRANSPARENCY & PEACE OF MIND
          </div>
          <h3 className="text-xl font-bold text-white">
            Frequently Asked Questions
          </h3>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="bg-[#111119] border border-[#1f1f2e] rounded-2xl overflow-hidden transition-all shadow-md"
            >
              <button
                onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                className="w-full p-4 text-left flex items-center justify-between gap-4 text-xs font-semibold text-white hover:text-[#0DF5C4] transition-colors"
              >
                <span>{faq.q}</span>
                {expandedFaq === i ? (
                  <ChevronUp className="w-4 h-4 text-[#787896]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#787896]" />
                )}
              </button>

              {expandedFaq === i && (
                <div className="px-4 pb-4 text-xs text-[#8c8ca5] leading-relaxed border-t border-[#1a1a28] pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA Banner (Pixel-Perfect to Screenshot 4) */}
      <div className="bg-[#12121c] border border-[#222234] rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-1 text-center md:text-left">
          <h3 className="text-xl font-extrabold text-white">
            Ready to accelerate your engineering workflow?
          </h3>
          <p className="text-xs text-[#8888a4]">
            Start building in your cloud workspace in under 10 seconds.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setPage("workspaces")}
            className="px-5 py-2.5 rounded-xl font-bold text-xs text-[#09090e] shadow-lg hover:brightness-110 active:scale-95 transition-all"
            style={{ backgroundColor: theme.primary }}
          >
            Create Free Account
          </button>
          <button
            onClick={() => alert("Opening engineering conversation channel.")}
            className="px-4 py-2.5 rounded-xl bg-[#181826] hover:bg-[#202034] border border-[#2c2c40] text-white text-xs font-semibold transition-colors"
          >
            Talk with Engineering
          </button>
        </div>
      </div>
    </div>
  );
};
