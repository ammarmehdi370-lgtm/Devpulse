"use client";

import React, { useState } from "react";
import { HelpCircle, Sparkles, X } from "lucide-react";

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

export const friendlyConfirm = (message: string) =>
  window.confirm(`${message}`);
