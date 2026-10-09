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
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none font-sans"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl bg-ide-surface-overlay backdrop-blur-xl border ${borderMap[toast.type]} shadow-xl text-xs transition-all duration-200 animate-in slide-in-from-bottom-2 fade-in`}
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
