"use client";

import React from "react";
import { Activity } from "lucide-react";
import { useApp } from "../context/AppContext";
import { PageHeader } from "./PageHeader";

export const ActivityPage: React.FC = () => {
  const { logs } = useApp();

  return (
    <section className="mx-auto max-w-5xl p-6 sm:p-8">
      <PageHeader page="activity" />
      {logs.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-8 text-center">
          <Activity aria-hidden="true" className="mx-auto h-8 w-8 text-[var(--muted)]" />
          <p className="mt-3 text-sm font-medium text-[var(--text)]">No activity yet</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Workspace events and deployment updates will appear here.
          </p>
        </div>
      ) : (
        <ol className="divide-y divide-[var(--border-subtle)] rounded-xl border border-[var(--border)] bg-[var(--surface-card)]">
          {[...logs].reverse().map((log) => (
            <li key={log.id} className="flex items-start gap-3 px-4 py-3">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-[var(--text)]">
                  <span className={`mr-2 font-mono text-xs ${log.color}`}>{log.tag}</span>
                  {log.text}
                </p>
                <time className="mt-1 block text-xs text-[var(--muted)]">{log.time}</time>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};
