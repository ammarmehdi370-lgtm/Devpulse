"use client";

import React from "react";
import { AlertCircle, Loader2 } from "lucide-react";

export const RepositoryCreateDialog: React.FC<{
  primaryColor: string;
  name: string;
  description: string;
  language: string;
  nameError: string;
  isCreating: boolean;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onLanguageChange: (language: string) => void;
  onClearError: () => void;
  onClose: () => void;
  onCancel: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}> = ({
  primaryColor,
  name,
  description,
  language,
  nameError,
  isCreating,
  onNameChange,
  onDescriptionChange,
  onLanguageChange,
  onClearError,
  onClose,
  onCancel,
  onSubmit,
}) => (
  <div className="fixed inset-0 bg-ide-overlay backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-ide-surface-card border border-ide-border-strong rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-ide-surface-control-hover">
        <h3 className="text-ide-text-strong font-bold text-base">
          Create a New Repository
        </h3>
        <button
          onClick={onClose}
          className="text-ide-muted hover:text-ide-text-strong text-sm"
        >
          ✕
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 text-xs">
        <div>
          <label className="text-ide-text-tertiary font-mono block mb-1">
            Repository Name <span className="text-ide-danger">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. edge-microservice"
            value={name}
            onChange={(event) => {
              onNameChange(event.target.value);
              onClearError();
            }}
            className={`w-full px-3 py-2.5 rounded-xl bg-ide-surface-control border text-ide-text-strong focus:outline-none ${
              nameError
                ? "border-ide-danger focus:border-ide-danger"
                : "border-ide-border-control focus:border-ide-repository-focus"
            }`}
          />
          {nameError && (
            <div className="flex items-center gap-1.5 mt-1.5 text-ide-danger">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{nameError}</span>
            </div>
          )}
        </div>

        <div>
          <label className="text-ide-text-tertiary font-mono block mb-1">
            Description (optional)
          </label>
          <input
            type="text"
            placeholder="e.g. High-throughput event pipeline"
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-ide-surface-control border border-ide-border-control text-ide-text-strong focus:outline-none focus:border-ide-repository-focus"
          />
        </div>

        <div>
          <label className="text-ide-text-tertiary font-mono block mb-1">
            Primary Language
          </label>
          <select
            value={language}
            onChange={(event) => onLanguageChange(event.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-ide-surface-control border border-ide-border-control text-ide-text-strong focus:outline-none focus:border-ide-repository-focus"
          >
            <option value="TypeScript">TypeScript</option>
            <option value="Python">Python</option>
            <option value="Rust">Rust</option>
            <option value="Go">Go</option>
          </select>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-ide-surface-hover text-ide-text-tertiary hover:text-ide-text-strong"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isCreating}
            className="px-5 py-2 rounded-xl font-semibold text-ide-accent-fg flex items-center gap-2 disabled:opacity-60"
            style={{ backgroundColor: primaryColor }}
          >
            {isCreating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isCreating ? "Creating…" : "Create Repository"}
          </button>
        </div>
      </form>
    </div>
  </div>
);
