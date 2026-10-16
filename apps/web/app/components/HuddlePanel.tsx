"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowDownRight,
  Camera,
  CameraOff,
  Check,
  Headphones,
  Info,
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

interface HuddlePanelProps {
  minimized: boolean;
  onMinimize: () => void;
  onExpand: () => void;
}

export const HuddlePanel: React.FC<HuddlePanelProps> = ({
  minimized,
  onMinimize,
  onExpand,
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
  const [permission, setPermission] = useState<"view" | "edit">("view");
  const permissionTriggerRef = useRef<HTMLButtonElement>(null);
  const viewOnlyInputRef = useRef<HTMLInputElement>(null);
  const permissionDialogRef = useRef<HTMLElement>(null);
  const localParticipant = participants.find((participant) => participant.isLocal);
  const sharingParticipant = participants.find(
    (participant) => participant.id === sharerId,
  );
  const otherParticipants = useMemo(
    () => participants.filter((participant) => !participant.isLocal),
    [participants],
  );
  const visibleParticipants = participants.slice(0, 4);
  const hiddenParticipantCount = Math.max(0, participants.length - 4);
  const localIsSharing = sharerId === localParticipant?.id;
  const canShare = !sharerId || localIsSharing;

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
    const handleDialogKeys = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeWithFocus();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = permissionDialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable.item(0);
      const last = focusable.item(focusable.length - 1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleDialogKeys);
    return () => window.removeEventListener("keydown", handleDialogKeys);
  }, [closeWithFocus, isPermissionOpen]);

  const requestControl = () => {
    if (selectedParticipant) grantControl(selectedParticipant, permission);
    closeWithFocus();
  };

  const openPermissionDialog = () => {
    setSelectedParticipant(otherParticipants[0]?.id ?? "");
    setPermission("view");
    setIsPermissionOpen(true);
  };

  const leaveHuddle = () => leave();

  const renderMuteButton = (compact = false) => (
    <button
      type="button"
      aria-label={localParticipant?.isMuted ? "Unmute microphone" : "Mute microphone"}
      title={localParticipant?.isMuted ? "Unmute microphone" : "Mute microphone"}
      onClick={toggleMute}
      className={
        compact
          ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ide-border-strong bg-ide-panel text-ide-text-secondary transition hover:border-ide-border hover:bg-ide-surface hover:text-ide-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
          : `flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring ${
              localParticipant?.isMuted
                ? "border-ide-danger/35 bg-ide-danger/10 text-ide-danger hover:bg-ide-danger/15"
                : "border-ide-border-strong bg-ide-panel text-ide-text-secondary hover:border-ide-border hover:bg-ide-surface hover:text-ide-text-strong"
            }`
      }
    >
      {localParticipant?.isMuted ? (
        <MicOff className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Mic className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );

  const leaveButton = (compact = false) => (
    <button
      type="button"
      aria-label="Leave huddle"
      title="Leave huddle"
      onClick={leaveHuddle}
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-ide-danger/35 bg-ide-danger/10 font-medium text-ide-danger transition hover:border-ide-danger/50 hover:bg-ide-danger/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-danger ${
        compact ? "h-9 px-3 text-[11px]" : "h-10 px-4 text-xs"
      }`}
    >
      <Headphones className="h-4 w-4" aria-hidden="true" />
      Leave
    </button>
  );

  return (
    <>
      <section
        aria-label="Team huddle"
        style={{
          maxHeight: minimized ? "3.5rem" : "40%",
          opacity: minimized ? 0.96 : 1,
        }}
        className="huddle-panel-motion relative mx-3 mb-3 flex min-h-0 shrink-0 flex-col overflow-hidden rounded-xl border border-ide-border-strong bg-ide-panel shadow-[0_12px_34px_color-mix(in_srgb,var(--ide-color-shadow-color)_22%,transparent)] ring-1 ring-inset ring-ide-border-subtle sm:mx-6 lg:mx-8"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-ide-accent/50 to-transparent" />

        <header className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-ide-border-subtle bg-ide-workbench-bg/70 px-3.5 py-2.5 sm:px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ide-accent/20 bg-ide-accent/10 text-ide-accent">
              <Headphones className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <h2 className="truncate text-xs font-semibold text-ide-text-strong">
                  Team huddle
                </h2>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-ide-success/25 bg-ide-success/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-ide-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-ide-success" />
                  Live
                </span>
                <span className="font-mono text-[11px] tabular-nums text-ide-text-secondary">
                  {formatDuration(elapsed)}
                </span>
                <span className="hidden items-center gap-1 text-[10px] text-ide-muted sm:inline-flex">
                  <Users className="h-3 w-3" aria-hidden="true" />
                  {participants.length}
                </span>
              </div>
              {!minimized && (
                <p className="mt-0.5 truncate text-[10px] text-ide-muted">
                  {sharingParticipant
                    ? `${sharingParticipant.name} is sharing their screen`
                    : "Your team is connected"}
                </p>
              )}
            </div>
          </div>

          {minimized ? (
            <div className="flex min-w-0 shrink-0 items-center gap-2">
              <div className="hidden items-center -space-x-2 sm:flex">
                {visibleParticipants.map((participant) => (
                  <Image
                    key={participant.id}
                    src={participant.avatar}
                    alt={participant.name}
                    width={28}
                    height={28}
                    unoptimized
                    className="h-7 w-7 rounded-full border-2 border-ide-panel object-cover"
                  />
                ))}
                {hiddenParticipantCount > 0 && (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-ide-panel bg-ide-surface text-[9px] font-semibold text-ide-text-secondary">
                    +{hiddenParticipantCount}
                  </span>
                )}
              </div>
              {renderMuteButton(true)}
              {leaveButton(true)}
              <button
                type="button"
                aria-label="Expand huddle"
                title="Expand huddle"
                onClick={onExpand}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ide-text-secondary transition hover:bg-ide-surface hover:text-ide-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
              >
                <ArrowDownRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              aria-label="Minimize"
              title="Minimize"
              onClick={onMinimize}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ide-text-secondary transition hover:bg-ide-surface hover:text-ide-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
            >
              <ArrowDownRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </header>

        {!minimized && (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4">
              {sharingParticipant && (
                <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(180px,0.34fr)]">
                  <div className="relative mx-auto aspect-video max-h-[220px] w-full overflow-hidden rounded-xl border border-ide-border-strong bg-ide-workbench-bg shadow-[0_8px_24px_color-mix(in_srgb,var(--ide-color-shadow-color)_18%,transparent)]">
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-ide-surface/50 via-ide-workbench-bg to-ide-panel">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-ide-info/20 bg-ide-info/10 text-ide-info">
                        <Monitor className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="text-[10px] text-ide-muted">
                        Screen preview is simulated in this mock huddle.
                      </span>
                    </div>
                    <div className="absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-lg border border-ide-border-strong bg-ide-panel/90 px-2.5 py-1.5 shadow-sm backdrop-blur">
                      {localIsSharing ? (
                        <>
                          <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-ide-danger motion-reduce:animate-none" />
                          <span className="truncate text-[10px] font-medium text-ide-text-strong">
                            You are sharing your screen
                          </span>
                        </>
                      ) : (
                        <span className="truncate text-[10px] font-medium text-ide-text-strong">
                          {sharingParticipant.name} is sharing
                        </span>
                      )}
                    </div>
                    {localIsSharing && (
                      <button
                        type="button"
                        onClick={() =>
                          localParticipant &&
                          stopScreenShare(localParticipant.id)
                        }
                        className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-lg border border-ide-danger/35 bg-ide-panel/95 px-2.5 py-1.5 text-[10px] font-medium text-ide-danger shadow-sm transition hover:bg-ide-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-danger"
                      >
                        <MonitorOff className="h-3.5 w-3.5" aria-hidden="true" />
                        Stop sharing
                      </button>
                    )}
                    {controlGrant && (
                      <div className="absolute inset-x-2 bottom-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ide-info/25 bg-ide-panel/95 px-2.5 py-2 shadow-sm backdrop-blur sm:inset-x-3 sm:bottom-3 sm:px-3">
                        <span className="min-w-0 truncate text-[10px] font-medium text-ide-info">
                          {controlGrant.permission === "edit"
                            ? `${controlGrant.participantName} is editing · Can edit`
                            : `${controlGrant.participantName} has view-only access · View only`}
                        </span>
                        {localIsSharing && (
                          <button
                            type="button"
                            onClick={revokeControl}
                            className="shrink-0 rounded-md border border-ide-border-strong bg-ide-panel px-2 py-1 text-[10px] font-medium text-ide-text-strong transition hover:bg-ide-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
                          >
                            Take back control
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 xl:grid-cols-1">
                    {visibleParticipants.map((participant) => (
                      <ParticipantTile
                        key={participant.id}
                        participant={participant}
                      />
                    ))}
                    {hiddenParticipantCount > 0 && (
                      <div className="flex min-h-16 items-center justify-center rounded-lg border border-dashed border-ide-border-strong bg-ide-workbench-bg px-3 text-xs font-medium text-ide-text-secondary">
                        +{hiddenParticipantCount} more
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!sharingParticipant && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {visibleParticipants.map((participant) => (
                    <ParticipantTile
                      key={participant.id}
                      participant={participant}
                    />
                  ))}
                  {hiddenParticipantCount > 0 && (
                    <div className="flex min-h-[68px] items-center justify-center rounded-lg border border-dashed border-ide-border-strong bg-ide-workbench-bg px-3 text-xs font-medium text-ide-text-secondary">
                      +{hiddenParticipantCount} more participant
                      {hiddenParticipantCount > 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              )}
            </div>

            <footer className="flex shrink-0 flex-wrap items-center justify-center gap-2 border-t border-ide-border-subtle bg-ide-workbench-bg/60 px-3 py-2.5 sm:gap-3">
              <div className="flex items-center gap-2">
                {renderMuteButton()}
                <button
                  type="button"
                  aria-label={
                    localParticipant?.isCameraOn
                      ? "Turn camera off"
                      : "Turn camera on"
                  }
                  title={
                    localParticipant?.isCameraOn
                      ? "Turn camera off"
                      : "Turn camera on"
                  }
                  onClick={toggleCamera}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring ${
                    localParticipant?.isCameraOn
                      ? "border-ide-border-strong bg-ide-panel text-ide-text-secondary hover:border-ide-border hover:bg-ide-surface hover:text-ide-text-strong"
                      : "border-ide-warning/35 bg-ide-warning/10 text-ide-warning hover:bg-ide-warning/15"
                  }`}
                >
                  {localParticipant?.isCameraOn ? (
                    <Camera className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <CameraOff className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
                {localIsSharing ? (
                  <button
                    type="button"
                    aria-label="Stop sharing screen"
                    title="Stop sharing screen"
                    onClick={() =>
                      localParticipant &&
                      stopScreenShare(localParticipant.id)
                    }
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ide-accent/35 bg-ide-accent/10 text-ide-accent transition hover:bg-ide-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
                  >
                    <MonitorOff className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-label="Share screen"
                    title={
                      canShare
                        ? "Share screen"
                        : `${sharingParticipant?.name ?? "A participant"} is sharing`
                    }
                    disabled={!canShare}
                    onClick={() =>
                      localParticipant &&
                      startScreenShare(localParticipant.id)
                    }
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ide-border-strong bg-ide-panel text-ide-text-secondary transition hover:border-ide-accent/40 hover:bg-ide-accent/10 hover:text-ide-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Monitor className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>

              {localIsSharing && (
                <>
                  <span className="hidden h-7 w-px bg-ide-border-strong sm:block" />
                  <button
                    type="button"
                    ref={permissionTriggerRef}
                    onClick={openPermissionDialog}
                    disabled={otherParticipants.length === 0}
                    title="Choose who can view or edit your code"
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-ide-info/30 bg-ide-info/10 px-3 text-[11px] font-medium text-ide-info transition hover:border-ide-info/45 hover:bg-ide-info/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring disabled:cursor-not-allowed disabled:opacity-45 sm:px-4"
                  >
                    <span>Let someone edit my code</span>
                    <Info
                      className="h-3.5 w-3.5 shrink-0"
                      aria-label="Choose a participant and access level for Pulse Pilot"
                    />
                  </button>
                </>
              )}

              <span className="hidden h-7 w-px bg-ide-border-strong sm:block" />
              {leaveButton()}
            </footer>
          </>
        )}
      </section>

      {isPermissionOpen && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-ide-overlay p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeWithFocus();
          }}
        >
          <section
            ref={permissionDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pulse-pilot-permission-title"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-ide-border-strong bg-ide-panel shadow-[0_24px_72px_color-mix(in_srgb,var(--ide-color-shadow-color)_55%,transparent)] ring-1 ring-inset ring-ide-border-subtle"
          >
            <header className="border-b border-ide-border-subtle bg-ide-workbench-bg/60 px-5 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3
                    id="pulse-pilot-permission-title"
                    className="text-sm font-semibold text-ide-text-strong"
                  >
                    Let{" "}
                    {otherParticipants.find(
                      (person) => person.id === selectedParticipant,
                    )?.name ?? "someone"}{" "}
                    edit your code?
                  </h3>
                  <p className="mt-1 text-[11px] leading-5 text-ide-text-soft">
                    Choose who can collaborate with you while you share.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close permission dialog"
                  onClick={closeWithFocus}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ide-text-soft transition hover:bg-ide-surface hover:text-ide-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </header>

            <div className="space-y-5 px-5 py-5 sm:px-6">
              <fieldset>
                <legend className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-ide-text-secondary">
                  Select a participant
                </legend>
                <div className="max-h-40 space-y-1.5 overflow-y-auto">
                  {otherParticipants.map((participant, index) => (
                    <label
                      key={participant.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                        selectedParticipant === participant.id
                          ? "border-ide-accent/35 bg-ide-accent/[0.07]"
                          : "border-ide-border-subtle bg-ide-workbench-bg/45 hover:border-ide-border-strong hover:bg-ide-workbench-bg"
                      }`}
                    >
                      <input
                        ref={index === 0 ? viewOnlyInputRef : undefined}
                        type="radio"
                        name="pulse-pilot-participant"
                        value={participant.id}
                        checked={selectedParticipant === participant.id}
                        onChange={() =>
                          setSelectedParticipant(participant.id)
                        }
                        className="h-4 w-4 shrink-0 accent-ide-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-ide-panel"
                      />
                      <Image
                        src={participant.avatar}
                        alt=""
                        width={36}
                        height={36}
                        unoptimized
                        className="h-9 w-9 shrink-0 rounded-full border border-ide-border-strong object-cover"
                      />
                      <span className="min-w-0 flex-1 truncate text-xs font-medium text-ide-text-strong">
                        {participant.name}
                      </span>
                      <span className="shrink-0 text-[10px] text-ide-muted">
                        {participant.isMuted ? "Muted" : "In huddle"}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-ide-text-secondary">
                  Access level
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      {
                        value: "view",
                        title: "View only",
                        description: "They can follow along.",
                      },
                      {
                        value: "edit",
                        title: "Can edit",
                        description: "They can make code changes.",
                      },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={permission === option.value}
                      onClick={() => setPermission(option.value)}
                      className={`min-w-0 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring ${
                        permission === option.value
                          ? "border-ide-accent/35 bg-ide-accent/[0.07] ring-1 ring-inset ring-ide-accent/20"
                          : "border-ide-border-subtle bg-ide-workbench-bg/45 hover:border-ide-border-strong hover:bg-ide-workbench-bg"
                      }`}
                    >
                      <span className="flex items-center gap-2 text-xs font-semibold text-ide-text-strong">
                        <span
                          className={`h-3.5 w-3.5 rounded-full border ${
                            permission === option.value
                              ? "border-[5px] border-ide-accent"
                              : "border-ide-border-strong"
                          }`}
                        />
                        {option.title}
                      </span>
                      <span className="mt-1.5 block pl-[22px] text-[10px] leading-4 text-ide-text-soft">
                        {option.description}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-ide-muted">
                  You can take back control at any time.
                </p>
              </fieldset>
            </div>

            <footer className="flex justify-end gap-2 border-t border-ide-border-subtle bg-ide-workbench-bg/45 px-5 py-3.5 sm:px-6">
              <button
                type="button"
                onClick={closeWithFocus}
                className="min-h-9 rounded-lg border border-ide-border-strong px-3.5 text-xs font-medium text-ide-text-secondary transition hover:bg-ide-surface hover:text-ide-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={requestControl}
                disabled={!selectedParticipant}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-ide-accent/30 bg-ide-accent/10 px-4 text-xs font-semibold text-ide-accent transition hover:bg-ide-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                Allow
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
};

const ParticipantTile: React.FC<{
  participant: {
    id: string;
    name: string;
    avatar: string;
    isLocal: boolean;
    isMuted: boolean;
    isSpeaking: boolean;
  };
}> = ({ participant }) => (
  <article className="flex min-w-0 items-center gap-2.5 rounded-lg border border-ide-border-subtle bg-ide-workbench-bg/70 px-2.5 py-2">
    <span
      className={`relative h-9 w-9 shrink-0 rounded-full ${
        participant.isSpeaking ? "huddle-speaking-ring" : ""
      }`}
    >
      <Image
        src={participant.avatar}
        alt={`${participant.name} avatar`}
        width={36}
        height={36}
        unoptimized
        className="relative z-[1] h-9 w-9 rounded-full border border-ide-border-strong object-cover"
      />
    </span>
    <span className="min-w-0 flex-1">
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="truncate text-[11px] font-semibold text-ide-text-strong">
          {participant.name}
        </span>
        {participant.isLocal && (
          <span className="shrink-0 rounded border border-ide-accent/25 bg-ide-accent/10 px-1 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-ide-accent">
            You
          </span>
        )}
      </span>
      <span className="mt-0.5 block truncate text-[9px] text-ide-text-soft">
        {participant.isMuted
          ? "Muted"
          : participant.isSpeaking
            ? "Speaking"
            : "Listening"}
      </span>
    </span>
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
        participant.isMuted
          ? "border-ide-danger/25 bg-ide-danger/10 text-ide-danger"
          : "border-ide-success/20 bg-ide-success/10 text-ide-success"
      }`}
      aria-label={participant.isMuted ? "Microphone muted" : "Microphone live"}
      title={participant.isMuted ? "Microphone muted" : "Microphone live"}
    >
      {participant.isMuted ? (
        <MicOff className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <Mic className="h-3.5 w-3.5" aria-hidden="true" />
      )}
    </span>
  </article>
);
