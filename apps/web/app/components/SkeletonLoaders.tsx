import React from "react";

export function RepositorySkeleton() {
  return (
    <div
      aria-hidden="true"
      className="animate-pulse rounded-lg border border-[var(--border)] bg-[var(--surface-card)] p-4"
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="space-y-1.5">
          <div className="h-4 w-36 rounded bg-[var(--skeleton-strong)]" />
          <div className="h-3 w-56 rounded bg-[var(--skeleton-mid)]" />
        </div>
        <div className="h-6 w-16 rounded-full bg-[var(--skeleton-mid)]" />
      </div>
      <div className="flex items-center gap-4">
        <div className="h-3 w-20 rounded bg-[var(--skeleton-mid)]" />
        <div className="h-3 w-16 rounded bg-[var(--skeleton-mid)]" />
        <div className="h-3 w-24 rounded bg-[var(--skeleton-mid)]" />
      </div>
    </div>
  );
}

export function WorkspaceSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="animate-pulse rounded-lg border border-[var(--border)] bg-[var(--surface-card)] p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-[var(--skeleton-strong)]" />
          <div className="space-y-1">
            <div className="h-4 w-32 rounded bg-[var(--skeleton-strong)]" />
            <div className="h-3 w-20 rounded bg-[var(--skeleton-mid)]" />
          </div>
        </div>
        <div className="h-5 w-16 rounded-full bg-[var(--skeleton-mid)]" />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="h-3 w-16 rounded bg-[var(--skeleton-mid)]" />
        <div className="h-3 w-20 rounded bg-[var(--skeleton-mid)]" />
        <div className="h-3 w-24 rounded bg-[var(--skeleton-mid)]" />
      </div>
    </div>
  );
}

export function ListSkeleton({
  count = 3,
  Skeleton = RepositorySkeleton,
}: {
  count?: number;
  Skeleton?: React.ComponentType;
}) {
  return (
    <div aria-busy="true" aria-label="Loading data" className="space-y-3">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} />
      ))}
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="mb-6 flex animate-pulse items-center justify-between"
    >
      <div className="space-y-1.5">
        <div className="h-6 w-40 rounded bg-[var(--skeleton-strong)]" />
        <div className="h-4 w-64 rounded bg-[var(--skeleton-mid)]" />
      </div>
      <div className="h-9 w-32 rounded-lg bg-[var(--skeleton-mid)]" />
    </div>
  );
}
