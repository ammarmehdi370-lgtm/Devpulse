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
      icon: <Sparkles className="w-5 h-5 text-[#0DF5C4]" />,
      actionLabel: 'Next: Repositories',
      hint: 'Step 1: Discover how projects sync across your team'
    },
    {
      title: 'Import or Launch Repositories 📦',
      desc: 'Connect your GitHub or GitLab repositories, or create a new template workspace with one click. Everything is pre-configured with package caches.',
      icon: <GitFork className="w-5 h-5 text-[#6C63FF]" />,
      actionLabel: 'Next: Devbox Workspaces',
      hint: 'Step 2: Start a dedicated cloud workspace anytime'
    },
    {
      title: 'Zero-Latency Workspaces & Deploys ⚡',
      desc: 'Spin up dedicated Firecracker microVMs in 1.2s, pair program with team members in real-time, and trigger global deployments.',
      icon: <Rocket className="w-5 h-5 text-[#ffae33]" />,
      actionLabel: 'Finish Tour & Get Started',
      hint: 'Step 3: You are ready to build at the speed of thought'
    }
  ];

  const current = tourSteps[tourStep] || tourSteps[0]!;

  return (
    <div
      role="region"
      aria-label="Welcome Tour"
      className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#141422] to-[#12121c] border border-[#2b2b42] shadow-2xl relative overflow-hidden font-sans animate-in fade-in"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            {current.icon}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#0DF5C4] font-semibold">
                QUICK TOUR · {tourStep + 1} OF {tourSteps.length}
              </span>
              <span className="text-white/20">|</span>
              <span className="text-[11px] text-[#8b8ba8] font-mono">{current.hint}</span>
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">{current.title}</h3>
            <p className="text-xs text-[#a4a4c6] max-w-2xl leading-relaxed">{current.desc}</p>
          </div>
        </div>

        {/* Tour Actions */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          {tourStep > 0 && (
            <button
              onClick={prevTourStep}
              className="px-3 py-1.5 rounded-xl bg-[#1b1b28] hover:bg-[#242436] text-xs font-mono text-[#c4c4dc] flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}

          <button
            onClick={nextTourStep}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#09090e] flex items-center gap-1.5 shadow-md transition-all hover:scale-[1.02] active:scale-98 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            style={{ backgroundColor: theme.primary }}
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
            className="p-1.5 rounded-xl text-[#71718c] hover:text-white hover:bg-white/10 transition-colors ml-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Dots */}
      <div className="flex items-center gap-1.5 pt-3 mt-3 border-t border-white/5">
        {tourSteps.map((_, idx) => (
          <div
            key={idx}
            className={`h-1 rounded-full transition-all ${
              idx === tourStep ? 'w-6 bg-[#0DF5C4]' : 'w-2 bg-[#28283a]'
            }`}
          />
        ))}
        <span className="text-[10px] font-mono text-[#6c6c88] ml-2">Click Dismiss anytime to close</span>
      </div>
    </div>
  );
};
