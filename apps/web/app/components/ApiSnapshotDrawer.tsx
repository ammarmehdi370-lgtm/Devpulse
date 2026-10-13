"use client";

import React from "react";

export type SnapshotRecord = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  volume: string;
  status: "AUTH_VERIFIED_SIMULATED" | "RATE_LIMIT_TEST_ACTIVE";
  security: string;
  securityBadge?: string;
  webhookDispatched: boolean;
};

export type SandboxSnapshot = {
  id: string;
  createdAt: string;
  records: SnapshotRecord[];
  transactionCount: number;
  customerCount: number;
  sessionCount: number;
};

export const ApiSnapshotDrawer: React.FC<{
  snapshots: SandboxSnapshot[];
  onClose: () => void;
  onRestore: (snapshot: SandboxSnapshot) => void;
}> = ({ snapshots, onClose, onRestore }) => (
  <div className="fixed right-4 top-16 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-lg border border-ide-modal-border bg-ide-surface p-3 shadow-2xl">
    <div className="mb-2 flex items-center justify-between">
      <h2 className="text-xs font-bold text-ide-text-strong">
        Sandbox snapshots
      </h2>
      <button
        type="button"
        onClick={onClose}
        className="text-xs text-ide-info hover:text-ide-text-strong"
      >
        Close
      </button>
    </div>
    {snapshots.length === 0 ? (
      <p className="text-xs text-ide-info">No snapshots yet.</p>
    ) : (
      <div className="max-h-64 space-y-2 overflow-y-auto">
        {snapshots.map((snapshot) => (
          <div
            key={snapshot.id}
            className="flex items-center justify-between gap-3 rounded border border-ide-modal-border bg-ide-panel p-2"
          >
            <div className="min-w-0">
              <div className="truncate font-mono text-[10px] text-ide-info">
                {snapshot.id}
              </div>
              <div className="text-[10px] text-ide-muted">
                {new Date(snapshot.createdAt).toLocaleString()} ·{" "}
                {snapshot.records.length} visible records
              </div>
            </div>
            <button
              type="button"
              onClick={() => onRestore(snapshot)}
              className="shrink-0 rounded border border-ide-info px-2 py-1 text-[10px] text-ide-text-strong hover:bg-ide-surface-raised"
            >
              Restore
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
);
