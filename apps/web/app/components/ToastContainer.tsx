'use client';

import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (!toasts || toasts.length === 0) return null;

  const iconMap = {
    success: <CheckCircle2 className="w-4 h-4 text-[#0DF5C4] shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-[#f87171] shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-[#ffae33] shrink-0" />,
    info: <Info className="w-4 h-4 text-[#6C63FF] shrink-0" />
  };

  const borderMap = {
    success: 'border-[#0DF5C4]/30 shadow-[#0DF5C4]/10',
    error: 'border-[#f87171]/40 shadow-[#f87171]/10',
    warning: 'border-[#ffae33]/30 shadow-[#ffae33]/10',
    info: 'border-[#6C63FF]/30 shadow-[#6C63FF]/10'
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
          className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl bg-[#111119]/95 backdrop-blur-xl border ${borderMap[toast.type]} shadow-xl text-xs transition-all duration-200 animate-in slide-in-from-bottom-2 fade-in`}
        >
          {iconMap[toast.type]}
          <div className="flex-1 space-y-0.5">
            <div className="font-semibold text-white tracking-tight">{toast.title}</div>
            {toast.description && (
              <div className="text-[11px] text-[#9ca3af] leading-relaxed">{toast.description}</div>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            aria-label="Dismiss notification"
            className="p-1 rounded-lg text-[#71718c] hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
