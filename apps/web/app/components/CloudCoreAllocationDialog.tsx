"use client";

import React from "react";
import { X } from "lucide-react";

type ProjectOption = { id: string; name: string; color: string };

export const CloudCoreAllocationDialog: React.FC<{
  projects: ProjectOption[];
  name: string;
  selectedProjectIds: string[];
  onNameChange: (name: string) => void;
  onProjectsChange: (projectIds: string[]) => void;
  onClose: () => void;
  onSubmit: () => void;
}> = ({
  projects,
  name,
  selectedProjectIds,
  onNameChange,
  onProjectsChange,
  onClose,
  onSubmit,
}) => (
  <div
    className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
    onClick={onClose}
  >
    <div
      className="w-full max-w-md rounded-2xl border border-ide-border-strong bg-ide-panel p-5 shadow-2xl"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[16px] font-semibold">Allocate a contributor</h3>
        <button onClick={onClose} aria-label="Close">
          <X className="h-4 w-4 text-ide-muted" />
        </button>
      </div>
      <p className="mb-4 text-[12px] text-ide-muted">
        They will receive a live hour mix from the projects you pick. Working %
        updates with the period dropdown.
      </p>
      <label className="block text-[12px] text-ide-text-secondary">
        Name
        <input
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Jamie Cole"
          className="mt-1 w-full rounded-lg border border-ide-border-strong bg-ide-workbench-bg px-3 py-2 text-[13px] outline-none focus:border-ide-secondary"
        />
      </label>
      <div className="mt-4 text-[12px] text-ide-text-secondary">Projects</div>
      <div className="mt-2 max-h-40 space-y-2 overflow-auto">
        {projects.map((project) => (
          <label
            key={project.id}
            className="flex items-center gap-2 text-[13px]"
          >
            <input
              type="checkbox"
              checked={selectedProjectIds.includes(project.id)}
              onChange={(event) =>
                onProjectsChange(
                  event.target.checked
                    ? [...selectedProjectIds, project.id]
                    : selectedProjectIds.filter((id) => id !== project.id),
                )
              }
            />
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: project.color }}
            />
            {project.name}
          </label>
        ))}
      </div>
      <button
        onClick={onSubmit}
        className="mt-5 w-full rounded-lg bg-ide-secondary py-2.5 text-[13px] font-semibold text-[var(--ide-color-secondary-fg)] hover:bg-ide-secondary"
      >
        Add to allocation board
      </button>
    </div>
  </div>
);
