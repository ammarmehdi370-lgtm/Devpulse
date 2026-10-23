"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Camera,
  CameraOff,
  Headphones,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  PhoneOff,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { useHuddle } from "../context/HuddleContext";

const POSITION_STORAGE_KEY = "devpulse-global-huddle-bar-position";
const BAR_MARGIN = 8;

type Position = { x: number; y: number };
type Bounds = { left: number; top: number; right: number; bottom: number };

const isPosition = (value: unknown): value is Position =>
  typeof value === "object" &&
  value !== null &&
  "x" in value &&
  typeof value.x === "number" &&
  Number.isFinite(value.x) &&
  "y" in value &&
  typeof value.y === "number" &&
  Number.isFinite(value.y);

const formatDuration = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;

const overlaps = (
  position: Position,
  width: number,
  height: number,
  bounds: Bounds,
) =>
  position.x < bounds.right &&
  position.x + width > bounds.left &&
  position.y < bounds.bottom &&
  position.y + height > bounds.top;

export const GlobalHuddleBar: React.FC = () => {
  const { page, setPage } = useApp();
  const huddle = useHuddle();
  const barRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    pointerX: number;
    pointerY: number;
    position: Position;
  } | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const isEditor = page === "editor";
  const isCompact = isEditor;
  const localParticipant = huddle.participants.find(
    (participant) => participant.isLocal,
  );
  const localIsSharing = huddle.sharerId === localParticipant?.id;
  const sharingParticipant = huddle.participants.find(
    (participant) => participant.id === huddle.sharerId,
  );
  const canShare = !huddle.sharerId || localIsSharing;
  const visibleParticipants = huddle.participants.slice(0, 3);
  const hiddenParticipantCount = Math.max(0, huddle.participants.length - 3);

  const getAvoidBounds = useCallback((): Bounds[] => {
    if (typeof document === "undefined" || !isEditor) return [];
    const selectors = [
      ".terminal-panel-open",
      ".editor-status-bar",
      'button[title^="Save changes"]',
      'button[title^="Run preview"]',
    ];
    return selectors.flatMap((selector) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) return [];
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return [];
      return [
        {
          left: rect.left - BAR_MARGIN,
          top: rect.top - BAR_MARGIN,
          right: rect.right + BAR_MARGIN,
          bottom: rect.bottom + BAR_MARGIN,
        },
      ];
    });
  }, [isEditor]);

  const clampPosition = useCallback(
    (requested: Position): Position => {
      const element = barRef.current;
      if (!element) return requested;
      const width = element.offsetWidth;
      const height = element.offsetHeight;
      const maxX = Math.max(BAR_MARGIN, window.innerWidth - width - BAR_MARGIN);
      const maxY = Math.max(BAR_MARGIN, window.innerHeight - height - BAR_MARGIN);
      const bounds = getAvoidBounds();
      let candidate = {
        x: Math.max(BAR_MARGIN, Math.min(requested.x, maxX)),
        y: Math.max(BAR_MARGIN, Math.min(requested.y, maxY)),
      };
      const collides = (point: Position) =>
        bounds.some((area) => overlaps(point, width, height, area));

      if (collides(candidate)) {
        for (let y = candidate.y - BAR_MARGIN; y >= BAR_MARGIN; y -= BAR_MARGIN) {
          const above = { ...candidate, y };
          if (!collides(above)) {
            candidate = above;
            break;
          }
        }
      }
      return candidate;
    },
    [getAvoidBounds],
  );

  const getDefaultPosition = useCallback((): Position => {
    const element = barRef.current;
    if (!element) return { x: BAR_MARGIN, y: BAR_MARGIN };
    const width = element.offsetWidth;
    const height = element.offsetHeight;
    let y = window.innerHeight - height - 20;
    if (isEditor) {
      const terminal = document.querySelector<HTMLElement>(
        ".terminal-panel-open",
      );
      const statusBar = document.querySelector<HTMLElement>(
        ".editor-status-bar",
      );
      const bottomObstacle = terminal ?? statusBar;
      if (bottomObstacle) {
        y = bottomObstacle.getBoundingClientRect().top - height - BAR_MARGIN;
      }
    }
    return clampPosition({ x: (window.innerWidth - width) / 2, y });
  }, [clampPosition, isEditor]);

  const updatePosition = useCallback(
    (next: Position) => setPosition(clampPosition(next)),
    [clampPosition],
  );

  useEffect(() => {
    if (!huddle.startedAt) {
      setElapsed(0);
      return;
    }
    const startedAt = huddle.startedAt;
    const updateElapsed = () =>
      setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    updateElapsed();
    const timer = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(timer);
  }, [huddle.startedAt]);

  useEffect(() => {
    if (!huddle.active || page === "chat") return;
    const frame = window.requestAnimationFrame(() => {
      let savedPosition: Position | null = null;
      try {
        const saved = window.localStorage.getItem(POSITION_STORAGE_KEY);
        if (saved !== null) {
          const parsed: unknown = JSON.parse(saved);
          if (isPosition(parsed)) savedPosition = parsed;
        }
      } catch (error) {
        console.error("Unable to restore global huddle bar position.", error);
      }
      setPosition(clampPosition(savedPosition ?? getDefaultPosition()));
      setPreferencesLoaded(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [clampPosition, getDefaultPosition, huddle.active, page]);

  useEffect(() => {
    if (!preferencesLoaded || !position) return;
    try {
      window.localStorage.setItem(
        POSITION_STORAGE_KEY,
        JSON.stringify(position),
      );
    } catch (error) {
      console.error("Unable to save global huddle bar position.", error);
    }
  }, [position, preferencesLoaded]);

  useEffect(() => {
    if (!position || !huddle.active || page === "chat") return;
    const reposition = () => updatePosition(position);
    const frame = window.requestAnimationFrame(reposition);
    window.addEventListener("resize", reposition);
    const observer = new ResizeObserver(reposition);
    if (barRef.current) observer.observe(barRef.current);
    const terminal = document.querySelector(".terminal-panel");
    if (terminal) observer.observe(terminal);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", reposition);
      observer.disconnect();
    };
  }, [huddle.active, page, position, updatePosition]);

  const navigateToChat = () => {
    try {
      window.localStorage.setItem("devpulse-huddle-expanded", "true");
    } catch (error) {
      console.error("Unable to expand huddle panel in Team Chat.", error);
    }
    setPage("chat");
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      event.button !== 0 ||
      (event.target as HTMLElement).closest("button") ||
      !position
    ) {
      return;
    }
    event.preventDefault();
    dragRef.current = {
      pointerId: event.pointerId,
      pointerX: event.clientX,
      pointerY: event.clientY,
      position,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    updatePosition({
      x: drag.position.x + event.clientX - drag.pointerX,
      y: drag.position.y + event.clientY - drag.pointerY,
    });
  };

  const onPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!position || event.target !== event.currentTarget) return;
    const offsets: Record<string, Position> = {
      ArrowLeft: { x: -8, y: 0 },
      ArrowRight: { x: 8, y: 0 },
      ArrowUp: { x: 0, y: -8 },
      ArrowDown: { x: 0, y: 8 },
    };
    const offset = offsets[event.key];
    if (!offset) return;
    event.preventDefault();
    updatePosition({ x: position.x + offset.x, y: position.y + offset.y });
  };

  const resetPosition = () => setPosition(getDefaultPosition());

  if (!huddle.active || page === "chat") return null;
  const renderedPosition = position ?? { x: 0, y: 0 };

  return (
    <div
      ref={barRef}
      role="group"
      aria-label="Active team huddle"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onKeyDown={onKeyDown}
      onDoubleClick={(event) => {
        if (!(event.target as HTMLElement).closest("button")) resetPosition();
      }}
      className={`fixed left-0 top-0 z-[70] flex w-max max-w-[calc(100vw-1rem)] items-center gap-1.5 overflow-x-auto rounded-full border border-ide-border bg-ide-panel px-2 py-1.5 text-ide-text-strong shadow-[0_16px_42px_var(--ide-color-shadow-strong),0_5px_16px_var(--ide-color-shadow-panel)] ring-1 ring-inset ring-ide-border-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring motion-safe:transition-transform motion-reduce:transition-none ${
        isCompact ? "gap-1 px-1.5 py-1" : "sm:gap-2 sm:px-3 sm:py-2"
      } ${position ? "cursor-grab touch-none active:cursor-grabbing" : "invisible"}`}
      style={{
        transform: `translate3d(${renderedPosition.x}px, ${renderedPosition.y}px, 0)`,
        visibility: preferencesLoaded && position ? "visible" : "hidden",
      }}
    >
      <button
        type="button"
        onClick={navigateToChat}
        aria-label="Open Team Chat and expand the huddle panel"
        title="Open Team Chat"
        className="flex min-w-0 items-center gap-1.5 rounded-full px-1.5 py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
      >
        <Headphones
          className={`shrink-0 text-ide-accent ${isCompact ? "h-3.5 w-3.5" : "h-4 w-4"}`}
          aria-hidden="true"
        />
        <span className="flex shrink-0 items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-ide-success">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ide-success motion-reduce:animate-none" />
          Live
        </span>
        <span className="font-mono text-[10px] tabular-nums text-ide-text-secondary">
          {formatDuration(elapsed)}
        </span>
      </button>

      <div className="flex shrink-0 items-center -space-x-2">
        {visibleParticipants.map((participant) => (
          <button
            key={participant.id}
            type="button"
            onClick={navigateToChat}
            aria-label={`Open Team Chat · ${participant.name}`}
            title={participant.name}
            className="rounded-full focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
          >
            <Image
              src={participant.avatar}
              alt={participant.name}
              width={isCompact ? 24 : 28}
              height={isCompact ? 24 : 28}
              unoptimized
              className={`rounded-full border-2 border-ide-panel object-cover ${
                isCompact ? "h-6 w-6" : "h-7 w-7"
              }`}
            />
          </button>
        ))}
        {hiddenParticipantCount > 0 && (
          <button
            type="button"
            onClick={navigateToChat}
            aria-label={`Open Team Chat · ${hiddenParticipantCount} more participants`}
            title={`${hiddenParticipantCount} more participants`}
            className={`flex items-center justify-center rounded-full border-2 border-ide-panel bg-ide-surface-raised text-[9px] font-semibold text-ide-text-secondary focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring ${
              isCompact ? "h-6 w-6" : "h-7 w-7"
            }`}
          >
            +{hiddenParticipantCount}
          </button>
        )}
      </div>

      {localIsSharing && (
        <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-medium text-ide-success">
          <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
          You are sharing
        </span>
      )}

      {huddle.controlGrant?.permission === "edit" && (
        <span className="flex shrink-0 items-center gap-1">
          <span className="text-[10px] text-ide-text-secondary">
            {huddle.controlGrant.participantName} is editing
          </span>
          <button
            type="button"
            onClick={huddle.revokeControl}
            aria-label="Take back control from Pulse Pilot"
            title="Take back control"
            className="rounded-full px-2 py-1 text-[10px] font-semibold text-ide-accent hover:bg-ide-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
          >
            Take back control
          </button>
        </span>
      )}

      <div
        className="mx-0.5 h-5 w-px shrink-0 bg-ide-border-strong"
        aria-hidden="true"
      />

      <button
        type="button"
        onClick={huddle.toggleMute}
        aria-label={
          localParticipant?.isMuted ? "Unmute microphone" : "Mute microphone"
        }
        title={localParticipant?.isMuted ? "Unmute microphone" : "Mute microphone"}
        className={`flex shrink-0 items-center justify-center rounded-full border border-ide-border-strong bg-ide-surface-control text-ide-text-secondary transition-colors hover:bg-ide-surface-control-hover hover:text-ide-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring ${
          isCompact ? "h-7 w-7" : "h-8 w-8"
        }`}
      >
        {localParticipant?.isMuted ? (
          <MicOff className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Mic className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </button>
      <button
        type="button"
        onClick={huddle.toggleCamera}
        aria-label={
          localParticipant?.isCameraOn ? "Turn camera off" : "Turn camera on"
        }
        title={
          localParticipant?.isCameraOn ? "Turn camera off" : "Turn camera on"
        }
        className={`flex shrink-0 items-center justify-center rounded-full border border-ide-border-strong bg-ide-surface-control text-ide-text-secondary transition-colors hover:bg-ide-surface-control-hover hover:text-ide-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring ${
          isCompact ? "h-7 w-7" : "h-8 w-8"
        }`}
      >
        {localParticipant?.isCameraOn ? (
          <Camera className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <CameraOff className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </button>
      <button
        type="button"
        onClick={() =>
          localParticipant &&
          (localIsSharing
            ? huddle.stopScreenShare(localParticipant.id)
            : huddle.startScreenShare(localParticipant.id))
        }
        aria-label={localIsSharing ? "Stop sharing" : "Share screen"}
        title={
          localIsSharing
            ? "Stop sharing"
            : canShare
              ? "Share screen"
              : `${sharingParticipant?.name ?? "A participant"} is sharing`
        }
        disabled={!canShare}
        className={`flex shrink-0 items-center justify-center rounded-full border border-ide-border-strong bg-ide-surface-control text-ide-text-secondary transition-colors hover:bg-ide-surface-control-hover hover:text-ide-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring disabled:cursor-not-allowed disabled:opacity-45 ${
          isCompact ? "h-7 w-7" : "h-8 w-8"
        }`}
      >
        {localIsSharing ? (
          <MonitorOff className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </button>
      <button
        type="button"
        onClick={huddle.leave}
        aria-label="Leave huddle"
        title="Leave huddle"
        className={`flex shrink-0 items-center justify-center rounded-full border border-ide-border-danger bg-ide-surface-danger text-ide-danger-readable transition-colors hover:bg-ide-danger/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring ${
          isCompact ? "h-7 w-7" : "h-8 w-8"
        }`}
      >
        <PhoneOff className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
};
