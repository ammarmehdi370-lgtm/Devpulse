"use client";

import React, { useEffect, useState } from "react";
import { AlertCircle, HelpCircle, Sparkles, X } from "lucide-react";

type ModalRequest = {
  message: string;
  mode: "alert" | "confirm";
  resolve: (result: boolean) => void;
};

const dispatchModal = (message: string, mode: ModalRequest["mode"]) =>
  new Promise<boolean>((resolve) => {
    window.dispatchEvent(
      new CustomEvent<ModalRequest>("devpulse:modal", {
        detail: { message, mode, resolve },
      }),
    );
  });

export const friendlyConfirm = (message: string) =>
  dispatchModal(message, "confirm");

export const friendlyAlert = async (message: string) => {
  await dispatchModal(message, "alert");
};

export const ModalHost: React.FC = () => {
  const [request, setRequest] = useState<ModalRequest | null>(null);

  useEffect(() => {
    const handleModalRequest = (event: Event) => {
      setRequest((event as CustomEvent<ModalRequest>).detail);
    };
    window.addEventListener("devpulse:modal", handleModalRequest);
    return () => window.removeEventListener("devpulse:modal", handleModalRequest);
  }, []);

  useEffect(() => {
    if (!request) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && request.mode === "confirm") {
        request.resolve(false);
        setRequest(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [request]);

  if (!request) return null;

  const close = (result: boolean) => {
    request.resolve(result);
    setRequest(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="app-modal-title"
        aria-describedby="app-modal-message"
        className="w-full max-w-md rounded-xl border border-[#303040] bg-[#111119] p-5 shadow-2xl shadow-black/50"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#0DF5C4]/25 bg-[#0DF5C4]/10 text-[#0DF5C4]">
            <AlertCircle className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="app-modal-title" className="text-sm font-semibold text-white">
              {request.mode === "confirm" ? "Confirm action" : "Notice"}
            </h2>
            <p id="app-modal-message" className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#b8b8ca]">
              {request.message}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={() => close(false)}
            className="rounded-md p-1 text-[#85859e] hover:bg-white/5 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          {request.mode === "confirm" && (
            <button
              type="button"
              onClick={() => close(false)}
              className="rounded-lg border border-[#343444] px-3.5 py-2 text-xs font-medium text-[#c5c5d3] transition hover:bg-white/5 hover:text-white"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            autoFocus
            onClick={() => close(true)}
            className="rounded-lg bg-[#0DF5C4] px-3.5 py-2 text-xs font-semibold text-[#08110f] transition hover:brightness-110"
          >
            {request.mode === "confirm" ? "Continue" : "OK"}
          </button>
        </div>
      </section>
    </div>
  );
};

export const HelpfulInfo: React.FC<{ text: string; className?: string }> = ({
  text,
  className = "",
}) => (
  <span
    className={`inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#b7b7d0] ${className}`}
    title={text}
    aria-label={text}
  >
    <HelpCircle className="w-3 h-3" />
  </span>
);

export const FriendlyHint: React.FC<{
  title: string;
  body: string;
  onDismiss?: () => void;
}> = ({ title, body, onDismiss }) => {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[#242436] bg-[#111119]/90 p-3 text-left shadow-lg">
      <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-xl bg-[#0DF5C4]/10 text-[#0DF5C4] border border-[#0DF5C4]/30">
        <Sparkles className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1">
        <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#8c8ca5]">
          Quick guide
        </div>
        <div className="mt-1 text-sm font-semibold text-white">{title}</div>
        <p className="mt-1 text-xs leading-relaxed text-[#a8a8c0]">{body}</p>
      </div>
      {onDismiss && (
        <button
          type="button"
          aria-label="Dismiss helper info"
          onClick={() => {
            setVisible(false);
            onDismiss();
          }}
          className="rounded-lg border border-[#2a2a3e] bg-[#171724] p-1 text-[#8c8ca5] hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};

