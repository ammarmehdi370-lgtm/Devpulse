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
    <div className="space-y-3 pb-4 border-b border-[#1c1c2b] font-sans">
      {/* Breadcrumbs Navigation */}
      <nav aria-label="Breadcrumbs" className="flex items-center gap-1.5 text-[11px] font-mono text-[#8b8ba8]">
        <button
          onClick={() => setPage('workspaces')}
          className="flex items-center gap-1 text-[#6b6b88] hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500 rounded"
        >
          <Home className="w-3 h-3" />
          <span>Devpulse</span>
        </button>
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={idx}>
            <ChevronRight className="w-3 h-3 text-[#44445c]" />
            {crumb.page ? (
              <button
                onClick={() => setPage(crumb.page!)}
                className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500 rounded"
              >
                {crumb.label}
              </button>
            ) : (
              <span className="text-[#d1d5db] font-medium" aria-current="page">
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
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {title}
            </h1>
            {badge && (
              <span
                role="status"
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium ${
                  badge.variant === 'live'
                    ? 'bg-[#0DF5C4]/15 border border-[#0DF5C4]/30 text-[#0DF5C4]'
                    : badge.variant === 'building'
                      ? 'bg-[#ffae33]/15 border border-[#ffae33]/30 text-[#ffae33]'
                      : 'bg-[#1b1b28] border border-[#2b2b40] text-[#a4a4c6]'
                }`}
              >
                {badge.variant === 'live' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0DF5C4] animate-pulse" />
                )}
                {badge.variant === 'building' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ffae33] animate-spin" />
                )}
                {badge.text}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs sm:text-sm text-[#9ca3af] leading-relaxed max-w-3xl">{subtitle}</p>}
        </div>

        {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
      </div>
    </div>
  );
};
