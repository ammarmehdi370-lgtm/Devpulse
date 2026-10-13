"use client";

import React from "react";
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from "lucide-react";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastMessage {
  id: string;
  title?: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

const TOAST_STYLES: Record<
  ToastVariant,
  { border: string; Icon: typeof Info }
> = {
  success: { border: "border-[var(--success)]", Icon: CheckCircle2 },
  error: { border: "border-[var(--danger)]", Icon: XCircle },
  warning: { border: "border-[var(--warning)]", Icon: TriangleAlert },
  info: { border: "border-[var(--info)]", Icon: Info },
};

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      aria-label="Notifications"
      aria-live="polite"
      className="fixed right-4 top-4 z-50 space-y-2"
    >
      {toasts.map((toast) => {
        const { border, Icon } = TOAST_STYLES[toast.variant];
        return (
          <div
            key={toast.id}
            role={toast.variant === "error" ? "alert" : "status"}
            className={`flex w-80 items-start gap-3 rounded-lg border-l-4 ${border} bg-[var(--surface-card)] p-3 text-[var(--text)] shadow-xl`}
          >
            <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              {toast.title && (
                <p className="text-sm font-semibold">{toast.title}</p>
              )}
              <p className="text-sm text-[var(--muted)]">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="rounded p-1 text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
