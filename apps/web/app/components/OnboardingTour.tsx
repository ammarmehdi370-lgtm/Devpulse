'use client';

import React from 'react';
import { useApp } from '../context/AppContext';
import { Sparkles, ArrowRight, ArrowLeft, X, Rocket, GitFork, Box, Check } from 'lucide-react';

export const OnboardingTour: React.FC = () => {
  const { isTourActive, tourStep, nextTourStep, prevTourStep, dismissTour, theme } = useApp();

  if (!isTourActive) return null;

  const tourSteps = [
    {
      title: 'Welcome to Devpulse Cloud 🚀',
      desc: 'Your all-in-one platform for instant cloud devboxes, collaborative code editing, and global edge deployments.',
      icon: <Sparkles className="w-5 h-5 text-ide-accent" />,
      actionLabel: 'Next: Repositories',
      hint: 'Step 1: Discover how projects sync across your team'
    },
    {
      title: 'Import or Launch Repositories 📦',
      desc: 'Connect your GitHub or GitLab repositories, or create a new template workspace with one click. Everything is pre-configured with package caches.',
      icon: <GitFork className="w-5 h-5 text-ide-secondary" />,
      actionLabel: 'Next: Devbox Workspaces',
      hint: 'Step 2: Start a dedicated cloud workspace anytime'
    },
    {
      title: 'Zero-Latency Workspaces & Deploys ⚡',
      desc: 'Spin up dedicated Firecracker microVMs in 1.2s, pair program with team members in real-time, and trigger global deployments.',
      icon: <Rocket className="w-5 h-5 text-ide-tertiary" />,
      actionLabel: 'Finish Tour & Get Started',
      hint: 'Step 3: You are ready to build at the speed of thought'
    }
  ];

  const current = tourSteps[tourStep] || tourSteps[0]!;

  return (
    <div
      role="region"
      aria-label="Welcome Tour"
      className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-ide-surface to-ide-panel border border-ide-border-strong shadow-2xl relative overflow-hidden font-sans animate-in fade-in"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[color-mix(in_srgb,var(--ide-color-text-strong)_5%,transparent)] border border-ide-border flex items-center justify-center shrink-0">
            {current.icon}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-ide-accent font-semibold">
                QUICK TOUR · {tourStep + 1} OF {tourSteps.length}
              </span>
              <span className="text-[color:color-mix(in_srgb,var(--ide-color-text-strong)_20%,transparent)]">|</span>
              <span className="text-[11px] text-ide-muted font-mono">{current.hint}</span>
            </div>
            <h3 className="text-base font-bold text-ide-text-strong tracking-tight">{current.title}</h3>
            <p className="text-xs text-ide-text-secondary max-w-2xl leading-relaxed">{current.desc}</p>
          </div>
        </div>

        {/* Tour Actions */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          {tourStep > 0 && (
            <button
              onClick={prevTourStep}
              className="px-3 py-1.5 rounded-xl bg-ide-surface-hover hover:bg-ide-surface-hover-strong text-xs font-mono text-ide-text-secondary flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ide-focus-ring"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}

          <button
            onClick={nextTourStep}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-ide-accent-fg flex items-center gap-1.5 shadow-md transition-all hover:scale-[1.02] active:scale-98 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
            style={{ backgroundColor: theme.ui.accent }}
          >
            <span>{current.actionLabel}</span>
            {tourStep < tourSteps.length - 1 ? (
              <ArrowRight className="w-3.5 h-3.5" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            onClick={dismissTour}
            title="Dismiss Tour"
            aria-label="Close tour"
            className="p-1.5 rounded-xl text-ide-text-dim hover:text-ide-text-strong hover:bg-[color-mix(in_srgb,var(--ide-color-text-strong)_10%,transparent)] transition-colors ml-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ide-focus-ring"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Dots */}
      <div className="flex items-center gap-1.5 pt-3 mt-3 border-t border-ide-border-subtle">
        {tourSteps.map((_, idx) => (
          <div
            key={idx}
            className={`h-1 rounded-full transition-all ${
              idx === tourStep ? 'w-6 bg-ide-accent' : 'w-2 bg-ide-surface-hover-strong'
            }`}
          />
        ))}
        <span className="text-[10px] font-mono text-ide-statusbar-fg ml-2">Click Dismiss anytime to close</span>
      </div>
    </div>
  );
};
