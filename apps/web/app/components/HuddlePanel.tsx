"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import {
  Camera,
  CameraOff,
  Check,
  Headphones,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  Users,
  X,
} from "lucide-react";
import { useHuddle } from "../context/HuddleContext";

const formatDuration = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;

export const HuddlePanel: React.FC<{ onClose: () => void }> = ({
  onClose,
}) => {
  const {
    startedAt,
    participants,
    sharerId,
    controlGrant,
    toggleMute,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
    grantControl,
    revokeControl,
    leave,
  } = useHuddle();
  const [elapsed, setElapsed] = useState(0);
  const [isPermissionOpen, setIsPermissionOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState("");
  const [permission, setPermission] = useState<"view" | "edit">("edit");
  const permissionTriggerRef = useRef<HTMLButtonElement>(null);
  const viewOnlyInputRef = useRef<HTMLInputElement>(null);
  const localParticipant = participants.find((participant) => participant.isLocal);
  const sharingParticipant = participants.find(
    (participant) => participant.id === sharerId,
  );
  const otherParticipants = useMemo(
    () => participants.filter((participant) => !participant.isLocal),
    [participants],
  );
  const canShare = !sharerId || sharerId === localParticipant?.id;

  useEffect(() => {
    if (!startedAt) return;
    const updateElapsed = () =>
      setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    updateElapsed();
    const timer = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  const closeWithFocus = useCallback(() => {
    setIsPermissionOpen(false);
    window.requestAnimationFrame(() => permissionTriggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!isPermissionOpen) return;
    window.requestAnimationFrame(() => viewOnlyInputRef.current?.focus());
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeWithFocus();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [closeWithFocus, isPermissionOpen]);

  const requestControl = () => {
    if (selectedParticipant) {
      grantControl(selectedParticipant, permission);
    }
    closeWithFocus();
  };

  return (
    <section
      aria-label="Team huddle"
      className="mx-3 mb-3 shrink-0 rounded-xl border border-ide-border-strong bg-ide-panel shadow-lg sm:mx-6 lg:mx-8"
    >
      <header className="flex items-center justify-between gap-3 border-b border-ide-border-strong px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Headphones className="h-4 w-4 shrink-0 text-ide-success" />
          <h2 className="text-sm font-semibold text-ide-text-strong">Huddle</h2>
          <span className="font-mono text-xs text-ide-muted">
            {formatDuration(elapsed)}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-ide-success/10 px-2 py-0.5 text-[10px] text-ide-success">
            <Users className="h-3 w-3" />
            {participants.length}
          </span>
        </div>
        <button
          type="button"
          aria-label="Hide huddle panel"
          title="Hide huddle panel"
          onClick={onClose}
          className="rounded-md p-1.5 text-ide-text-soft hover:bg-ide-surface hover:text-ide-text-strong"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="grid gap-3 p-3 sm:grid-cols-2">
        {participants.map((participant) => (
          <article
            key={participant.id}
            className={`flex items-center gap-3 rounded-lg border bg-ide-workbench-bg p-3 ${
              participant.isSpeaking
                ? "border-ide-success"
                : "border-ide-border-strong"
            }`}
          >
            <div className="relative">
              <Image
                src={participant.avatar}
                alt={`${participant.name} avatar`}
                width={40}
                height={40}
                loading="lazy"
                decoding="async"
                unoptimized
                className="h-10 w-10 rounded-full object-cover ring-1 ring-ide-border-strong"
              />
              {participant.isSpeaking && (
                <span
                  aria-label={`${participant.name} is speaking`}
                  className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-ide-workbench-bg bg-ide-success"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-ide-text-strong">
                {participant.name}
                {participant.isLocal ? " (you)" : ""}
              </div>
              <div className="mt-1 text-[10px] text-ide-muted">
                {participant.isMuted ? "Muted" : participant.isSpeaking ? "Speaking" : "Listening"}
              </div>
            </div>
            {participant.isMuted ? (
              <MicOff className="h-3.5 w-3.5 text-ide-warning" aria-hidden="true" />
            ) : (
              <Mic className="h-3.5 w-3.5 text-ide-success" aria-hidden="true" />
            )}
          </article>
        ))}
      </div>

      {sharingParticipant && (
        <div className="mx-3 mb-3 flex min-h-24 items-center justify-center rounded-lg border border-ide-border-strong bg-ide-workbench-bg p-4 text-center">
          <div>
            <Monitor className="mx-auto mb-2 h-5 w-5 text-ide-info" />
            <p className="text-xs font-medium text-ide-text-strong">
              {sharingParticipant.isLocal
                ? "You are sharing your screen"
                : `${sharingParticipant.name} is sharing`}
            </p>
            <p className="mt-1 text-[10px] text-ide-muted">
              Screen preview is simulated in this mock huddle.
            </p>
          </div>
        </div>
      )}

      {controlGrant && (
        <div className="mx-3 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ide-info/30 bg-ide-info/10 px-3 py-2">
          <span className="text-xs font-medium text-ide-info">
            {controlGrant.permission === "edit"
              ? `${controlGrant.participantName} is editing`
              : `${controlGrant.participantName} has view-only access`}
          </span>
          {localParticipant?.id === sharerId && (
            <button
              type="button"
              onClick={revokeControl}
              className="rounded-md border border-ide-border-strong bg-ide-panel px-2.5 py-1 text-[11px] font-medium text-ide-text-strong hover:bg-ide-surface"
            >
              Take back control
            </button>
          )}
        </div>
      )}

      <footer className="flex flex-wrap items-center justify-center gap-2 border-t border-ide-border-strong px-3 py-3">
        <button
          type="button"
          aria-label={localParticipant?.isMuted ? "Unmute microphone" : "Mute microphone"}
          title={localParticipant?.isMuted ? "Unmute microphone" : "Mute microphone"}
          onClick={toggleMute}
          className="inline-flex items-center gap-2 rounded-lg border border-ide-border-strong bg-ide-surface px-3 py-2 text-xs text-ide-text-strong hover:bg-ide-surface-toolbar"
        >
          {localParticipant?.isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          <span>{localParticipant?.isMuted ? "Unmute" : "Mute"}</span>
        </button>
        <button
          type="button"
          aria-label={localParticipant?.isCameraOn ? "Turn camera off" : "Turn camera on"}
          title={localParticipant?.isCameraOn ? "Turn camera off" : "Turn camera on"}
          onClick={toggleCamera}
          className="inline-flex items-center gap-2 rounded-lg border border-ide-border-strong bg-ide-surface px-3 py-2 text-xs text-ide-text-strong hover:bg-ide-surface-toolbar"
        >
          {localParticipant?.isCameraOn ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
          <span>Camera</span>
        </button>
        {sharerId === localParticipant?.id ? (
          <button
            type="button"
            aria-label="Stop sharing screen"
            title="Stop sharing"
            onClick={() => localParticipant && stopScreenShare(localParticipant.id)}
            className="inline-flex items-center gap-2 rounded-lg border border-ide-border-strong bg-ide-surface px-3 py-2 text-xs text-ide-text-strong hover:bg-ide-surface-toolbar"
          >
            <MonitorOff className="h-4 w-4" />
            <span>Stop sharing</span>
          </button>
        ) : (
          <button
            type="button"
            aria-label="Share screen"
            title={canShare ? "Share screen" : `${sharingParticipant?.name ?? "A participant"} is sharing`}
            disabled={!canShare}
            onClick={() => localParticipant && startScreenShare(localParticipant.id)}
            className="inline-flex items-center gap-2 rounded-lg border border-ide-border-strong bg-ide-surface px-3 py-2 text-xs text-ide-text-strong hover:bg-ide-surface-toolbar disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Monitor className="h-4 w-4" />
            <span>Share screen</span>
          </button>
        )}
        {sharerId === localParticipant?.id && (
          <button
            type="button"
            ref={permissionTriggerRef}
            onClick={() => {
              setSelectedParticipant(otherParticipants[0]?.id ?? "");
              setPermission("edit");
              setIsPermissionOpen(true);
            }}
            disabled={otherParticipants.length === 0}
            className="rounded-lg border border-ide-info/40 bg-ide-info/10 px-3 py-2 text-xs font-medium text-ide-info hover:bg-ide-info/20 disabled:opacity-50"
          >
            Pulse Pilot
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            leave();
            onClose();
          }}
          className="rounded-lg bg-ide-danger px-3 py-2 text-xs font-semibold text-ide-accent-fg hover:brightness-110"
        >
          Leave
        </button>
      </footer>

      {isPermissionOpen && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-ide-overlay p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeWithFocus();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="pulse-pilot-permission-title"
            className="w-full max-w-sm rounded-xl border border-ide-border-strong bg-ide-panel p-5 shadow-2xl"
          >
            <h3
              id="pulse-pilot-permission-title"
              className="text-sm font-semibold text-ide-text-strong"
            >
              Let {otherParticipants.find((person) => person.id === selectedParticipant)?.name ?? "participant"} edit your code?
            </h3>
            <label className="mt-4 block text-xs text-ide-text-secondary">
              Participant
              <select
                value={selectedParticipant}
                onChange={(event) => setSelectedParticipant(event.target.value)}
                className="mt-1 w-full rounded-lg border border-ide-border-strong bg-ide-workbench-bg px-3 py-2 text-xs text-ide-text-strong"
              >
                {otherParticipants.map((participant) => (
                  <option key={participant.id} value={participant.id}>
                    {participant.name}
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="mt-4 space-y-2">
              <legend className="sr-only">Code access level</legend>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-ide-border-strong p-3 text-xs text-ide-text-secondary">
                <input
                  ref={viewOnlyInputRef}
                  type="radio"
                  name="huddle-permission"
                  value="view"
                  checked={permission === "view"}
                  onChange={() => setPermission("view")}
                />
                View only
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-ide-border-strong p-3 text-xs text-ide-text-secondary">
                <input
                  type="radio"
                  name="huddle-permission"
                  value="edit"
                  checked={permission === "edit"}
                  onChange={() => setPermission("edit")}
                />
                Can edit
              </label>
            </fieldset>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeWithFocus}
                className="rounded-lg border border-ide-border-strong px-3 py-2 text-xs text-ide-text-secondary hover:bg-ide-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={requestControl}
                className="inline-flex items-center gap-1.5 rounded-lg bg-ide-info px-3 py-2 text-xs font-semibold text-ide-accent-fg"
              >
                <Check className="h-3.5 w-3.5" />
                Allow
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
};
