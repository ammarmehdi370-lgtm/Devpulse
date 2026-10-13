"use client";

import React from "react";
import { ArrowRight, type LucideIcon, X } from "lucide-react";
import type { ActivityEvent } from "../context/AppContext";

export const ActivityDetailDialog: React.FC<{
  event: ActivityEvent;
  icon: LucideIcon;
  colorClass: string;
  onClose: () => void;
  onNavigate: (destination: "deployments" | "workspaces" | "repositories") => void;
}> = ({ event, icon: Icon, colorClass, onClose, onNavigate }) => (
  <div
    className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    onMouseDown={(mouseEvent) => {
      if (mouseEvent.target === mouseEvent.currentTarget) onClose();
    }}
  >
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="activity-detail-title"
      className="w-full max-w-md rounded-2xl border border-ide-border-strong bg-ide-panel p-5 shadow-2xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${colorClass}`}
          >
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <span className="text-[9px] uppercase tracking-wider text-[var(--ide-color-secondary-readable)]">
              {event.category}
            </span>
            <h2
              id="activity-detail-title"
              className="mt-1 text-sm font-semibold capitalize text-ide-text-strong"
            >
              {event.title}
            </h2>
          </div>
        </div>
        <button
          type="button"
          aria-label="Close activity details"
          onClick={onClose}
          className="rounded-lg p-1 text-ide-muted hover:bg-ide-hover hover:text-ide-text-strong"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-4 break-words text-xs leading-6 text-ide-text-tertiary">
        {event.detail}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-ide-border-strong pt-4 text-[10px]">
        <div>
          <dt className="text-ide-muted">Project / target</dt>
          <dd className="mt-1 break-all text-ide-text">{event.project}</dd>
        </div>
        <div>
          <dt className="text-ide-muted">Actor</dt>
          <dd className="mt-1 text-ide-text">{event.actor}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-ide-muted">Recorded</dt>
          <dd className="mt-1 text-ide-text">
            {new Date(event.timestamp).toLocaleString()}
          </dd>
        </div>
      </dl>
      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={() =>
            onNavigate(
              event.category === "Release"
                ? "deployments"
                : event.category === "Workspace"
                  ? "workspaces"
                  : "repositories",
            )
          }
          className="inline-flex items-center gap-2 rounded-lg bg-ide-secondary px-3 py-2 text-[10px] font-semibold text-[var(--ide-color-secondary-fg)] hover:bg-ide-secondary"
        >
          Open{" "}
          {event.category === "Release"
            ? "releases"
            : event.category === "Workspace"
              ? "workspaces"
              : "projects"}
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </section>
  </div>
);
