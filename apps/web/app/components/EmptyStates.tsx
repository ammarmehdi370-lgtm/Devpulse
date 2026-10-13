import React from "react";
import {
  GitBranch,
  MessageSquare,
  Rocket,
  Server,
  type LucideIcon,
} from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface-card)]">
        <Icon aria-hidden="true" className="h-6 w-6 text-[var(--muted)]" />
      </div>
      <h3 className="mb-1 font-semibold text-[var(--text)]">{title}</h3>
      <p className="mb-4 max-w-xs text-sm text-[var(--muted)]">{description}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-fg)] transition-colors hover:bg-[var(--accent-hover)]"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export function NoRepositoriesEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={GitBranch}
      title="No repositories yet"
      description="Create your first repository to start coding in Devpulse."
      action={{ label: "+ New Repository", onClick: onCreate }}
    />
  );
}

export function NoWorkspacesEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={Server}
      title="No workspaces yet"
      description="Provision a devbox from a repository or template to get started."
      action={{ label: "+ New Workspace", onClick: onCreate }}
    />
  );
}

export function NoDeploymentsEmpty({ onDeploy }: { onDeploy: () => void }) {
  return (
    <EmptyState
      icon={Rocket}
      title="No deployments"
      description="Trigger your first release to see it here."
      action={{ label: "Deploy Now", onClick: onDeploy }}
    />
  );
}

export function NoChatMessages({ channelName }: { channelName: string }) {
  return (
    <EmptyState
      icon={MessageSquare}
      title={`#${channelName}`}
      description="No messages yet. Say hello!"
    />
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[var(--danger)] bg-[var(--surface-card)] px-6 py-10 text-center"
    >
      <p className="max-w-xl text-sm text-[var(--text)]">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-lg border border-[var(--danger)] px-4 py-2 text-sm font-medium text-[var(--text)] transition-colors"
      >
        Retry
      </button>
    </div>
  );
}
