'use client';

import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (!toasts || toasts.length === 0) return null;

  const iconMap = {
    success: <CheckCircle2 className="w-4 h-4 text-ide-success shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-ide-danger shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-ide-warning shrink-0" />,
    info: <Info className="w-4 h-4 text-ide-info shrink-0" />
  };

  const borderMap = {
    success: 'border-[color-mix(in_srgb,var(--ide-color-success)_30%,transparent)] shadow-[0_0_16px_color-mix(in_srgb,var(--ide-color-success)_10%,transparent)]',
    error: 'border-[color-mix(in_srgb,var(--ide-color-danger)_40%,transparent)] shadow-[0_0_16px_color-mix(in_srgb,var(--ide-color-danger)_10%,transparent)]',
    warning: 'border-[color-mix(in_srgb,var(--ide-color-warning)_30%,transparent)] shadow-[0_0_16px_color-mix(in_srgb,var(--ide-color-warning)_10%,transparent)]',
    info: 'border-[color-mix(in_srgb,var(--ide-color-info)_30%,transparent)] shadow-[0_0_16px_color-mix(in_srgb,var(--ide-color-info)_10%,transparent)]'
  };

  return (
    <div
      role="region"
      aria-label="Notifications"
      className="pointer-events-none fixed right-3 top-[4.5rem] z-[110] flex w-[min(24rem,calc(100vw-1.5rem))] flex-col gap-2 font-sans sm:right-5"
    >
      {toasts.slice(-3).map((toast) => (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          className={`pointer-events-auto flex min-w-0 items-start gap-3 rounded-xl border bg-ide-panel/95 p-3.5 text-xs shadow-xl backdrop-blur-xl transition-all duration-200 animate-in slide-in-from-top-2 fade-in motion-reduce:animate-none ${borderMap[toast.type]}`}
        >
          {iconMap[toast.type]}
          <div className="flex-1 space-y-0.5">
            <div className="font-semibold text-ide-text-strong tracking-tight">{toast.title}</div>
            {toast.description && (
              <div className="text-[11px] text-ide-text-soft leading-relaxed">{toast.description}</div>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            aria-label="Dismiss notification"
            className="p-1 rounded-lg text-ide-text-dim hover:text-ide-text-strong hover:bg-[color-mix(in_srgb,var(--ide-color-text-strong)_10%,transparent)] transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
