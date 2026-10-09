'use client';

import React from 'react';
import { useApp, PageType } from '../context/AppContext';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  page?: PageType;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs: BreadcrumbItem[];
  badge?: {
    text: string;
    variant?: 'live' | 'building' | 'neutral';
  };
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  badge,
  actions
}) => {
  const { setPage } = useApp();

  return (
    <div className="space-y-3 pb-4 border-b border-ide-elevated font-sans">
      {/* Breadcrumbs Navigation */}
      <nav aria-label="Breadcrumbs" className="flex items-center gap-1.5 text-[11px] font-mono text-ide-muted">
        <button
          onClick={() => setPage('workspaces')}
          className="flex items-center gap-1 text-ide-text-dim hover:text-ide-text-strong transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ide-focus-ring rounded"
        >
          <Home className="w-3 h-3" />
          <span>Devpulse</span>
        </button>
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={idx}>
            <ChevronRight className="w-3 h-3 text-ide-gutter-fg" />
            {crumb.page ? (
              <button
                onClick={() => setPage(crumb.page!)}
                className="hover:text-ide-text-strong transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ide-focus-ring rounded"
              >
                {crumb.label}
              </button>
            ) : (
              <span className="text-ide-text font-medium" aria-current="page">
                {crumb.label}
              </span>
            )}
          </React.Fragment>
        ))}
      </nav>

      {/* Main Title Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ide-text-strong tracking-tight">
              {title}
            </h1>
            {badge && (
              <span
                role="status"
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium ${
                  badge.variant === 'live'
                    ? 'bg-[color-mix(in_srgb,var(--ide-color-success)_15%,transparent)] border border-[color-mix(in_srgb,var(--ide-color-success)_30%,transparent)] text-ide-success'
                    : badge.variant === 'building'
                      ? 'bg-[color-mix(in_srgb,var(--ide-color-warning)_15%,transparent)] border border-[color-mix(in_srgb,var(--ide-color-warning)_30%,transparent)] text-ide-warning'
                      : 'bg-ide-surface-hover border border-ide-border-strong text-ide-text-secondary'
                }`}
              >
                {badge.variant === 'live' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-ide-success animate-pulse" />
                )}
                {badge.variant === 'building' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-ide-warning animate-spin" />
                )}
                {badge.text}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs sm:text-sm text-ide-text-soft leading-relaxed max-w-3xl">{subtitle}</p>}
        </div>

        {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
      </div>
    </div>
  );
};
