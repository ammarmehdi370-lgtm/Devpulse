"use client";

import React, { useEffect, useRef } from "react";

interface ChatModalProps {
  labelledBy: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export const ChatModal: React.FC<ChatModalProps> = ({
  labelledBy,
  onClose,
  children,
  className = "",
}) => {
  const dialogRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const focusable = () =>
      Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex="0"]',
        ) ?? [],
      );
    (dialogRef.current?.querySelector<HTMLElement>("[data-autofocus]") ??
      focusable()[0])?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
      } else if (event.key === "Tab") {
        const items = focusable();
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-ide-overlay/65 p-4 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200 motion-reduce:animate-none"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCloseRef.current();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-ide-border-strong bg-ide-panel text-ide-text-strong shadow-[0_24px_72px_var(--ide-color-shadow-strong)] motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:duration-200 motion-reduce:animate-none ${className}`}
      >
        {children}
      </section>
    </div>
  );
};
