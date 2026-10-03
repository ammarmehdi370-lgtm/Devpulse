"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useApp } from "../context/AppContext";
import { friendlyAlert, friendlyConfirm } from "./FriendlyHelpers";
import { io, Socket } from "socket.io-client";
import {
  Layers,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Lock,
  Unlock,
  Terminal,
  MessageSquare,
  Radio,
  Check,
  X,
  Monitor,
  Clock,
  Users,
  Code2,
} from "lucide-react";

export const RemoteControlPage: React.FC = () => {
  const {
    theme,
    setPage,
    remoteCode,
    updateRemoteCode,
    isRemoteControlling,
    setIsRemoteControlling,
    isRemoteMuted,
    setIsRemoteMuted,
    isRemoteCameraOn,
    setIsRemoteCameraOn,
  } = useApp();

  const [seconds, setSeconds] = useState(0);
  const [latency, setLatency] = useState(18);
  const [ahmedTyping, setAhmedTyping] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [remoteSelection, setRemoteSelection] = useState({ start: 0, end: 0 });
  const updateRemoteCodeRef = React.useRef(updateRemoteCode);
  updateRemoteCodeRef.current = updateRemoteCode;
  const workspaceId = "demo";

  useEffect(() => {
    setSessionStartedAt((current) => current ?? Date.now());
    const client = io(
      process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4001",
      { transports: ["websocket"] },
    );
    setSocket(client);
    client.emit("workspace:join", workspaceId);
    client.emit("presence:update", { workspaceId, status: "controlling" });
    client.on("session:state", (payload: { startedAt: number }) =>
      setSessionStartedAt(payload.startedAt),
    );
    client.on("code:changed", (payload: { code: string }) =>
      updateRemoteCodeRef.current(payload.code),
    );
    client.on("cursor:changed", (payload: { start: number; end: number }) =>
      setRemoteSelection({ start: payload.start, end: payload.end }),
    );
    client.on("typing:changed", (payload: { typing: boolean }) =>
      setAhmedTyping(payload.typing),
    );
    return () => {
      client.emit("workspace:leave", workspaceId);
      client.disconnect();
      setSocket(null);
    };
  }, []);

  useEffect(() => {
    if (!sessionStartedAt) return;
    const updateTimer = () =>
      setSeconds(
        Math.max(0, Math.floor((Date.now() - sessionStartedAt) / 1000)),
      );
    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [sessionStartedAt]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLatency(17 + Math.floor(Math.random() * 3));
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  const handleRemoteCodeChange = (code: string, start: number, end: number) => {
    updateRemoteCode(code);
    socket?.emit("code:change", { workspaceId, code, revision: Date.now() });
    socket?.emit("cursor:update", { workspaceId, start, end });
    socket?.emit("typing:update", { workspaceId, typing: true });
  };

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStopSession = async () => {
    if (await friendlyConfirm("End this Pulse Pilot session?")) {
      setPage("editor");
    }
  };

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col overflow-hidden bg-[#08090f] font-sans text-white">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-[#242432] bg-[#101018] px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#0DF5C4]/25 bg-[#0DF5C4]/10 text-[#0DF5C4]">
            <Radio className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h1 className="text-sm font-semibold text-white sm:text-base">
                Pulse Pilot
              </h1>
              <span className="flex items-center gap-1.5 rounded-full border border-[#0DF5C4]/25 bg-[#0DF5C4]/10 px-2 py-0.5 font-mono text-[9px] font-semibold text-[#0DF5C4]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0DF5C4]" /> LIVE
                SESSION
              </span>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-[#9292a9] sm:text-xs">
              Pair-programming in Ahmed&apos;s workspace
            </p>
          </div>
        </div>
        <span className="hidden text-xs text-[#85859e] lg:block">
          Edits sync in real time
        </span>
      </header>

      <div className="z-20 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#242432] bg-[#0d0d14] px-4 py-2.5 sm:px-6">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#09090e]"
              style={{ backgroundColor: theme.primary }}
            >
              <Layers className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold text-white">
                  Ahmed&apos;s Workspace
                </span>
                <span className="flex items-center gap-1.5 rounded-full border border-[#0DF5C4]/25 bg-[#0DF5C4]/10 px-2 py-0.5 font-mono text-[9px] font-bold text-[#0DF5C4]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0DF5C4]" />{" "}
                  LIVE
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] text-[#8e8ea6]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0DF5C4]" />
                us-east · {latency}ms · peer-to-peer
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-lg border border-[#29293a] bg-[#15151f] px-2.5 py-1.5">
            <div className="flex -space-x-2" aria-hidden="true">
              <Image
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces"
                alt=""
                width={24}
                height={24}
                unoptimized
                className="h-6 w-6 rounded-full object-cover ring-2 ring-[#15151f]"
              />
              <Image
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces"
                alt=""
                width={24}
                height={24}
                unoptimized
                className="h-6 w-6 rounded-full object-cover ring-2 ring-[#15151f]"
              />
            </div>
            <div className="leading-tight">
              <div className="text-[11px] font-medium text-[#d5d5e2]">
                2 collaborators
              </div>
              <div className="mt-0.5 text-[9px] text-[#85859e]">
                Ahmed · you
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-[#29293a] bg-[#15151f] px-3 py-2 font-mono text-xs font-semibold text-[#0DF5C4]">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatTime(seconds)}</span>
          </div>
          <button
            onClick={handleStopSession}
            className="flex items-center gap-2 rounded-lg border border-[#f43f5e]/35 bg-[#f43f5e]/10 px-3 py-2 text-xs font-semibold text-[#fb7185] transition-colors hover:bg-[#f43f5e]/20"
          >
            <X className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">End session</span>
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-2 overflow-hidden bg-[#08090f] md:grid-cols-2 md:grid-rows-1 md:divide-x md:divide-[#242432]">
        {/* Left Pane: YOUR VIEW (Alex) */}
        <section className="flex min-h-0 flex-col overflow-hidden bg-[#09090f]">
          {/* Sub-Header */}
          <div className="flex min-h-11 shrink-0 items-center justify-between gap-3 border-b border-[#242432] bg-[#11111a] px-3 sm:px-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="shrink-0 text-xs font-semibold text-[#d8d8e8]">
                Your editor
              </span>

              <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto">
                <span className="flex shrink-0 items-center gap-1.5 rounded-md border border-[#303040] bg-[#191923] px-2.5 py-1.5 font-mono text-[11px] font-medium text-white">
                  <span className="text-[#FF9E64]">JS</span> index.js
                </span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 text-[10px] sm:gap-3 sm:text-[11px]">
              <span className="flex items-center gap-1 text-[#0DF5C4]">
                <Check className="h-3 w-3" />{" "}
                <span className="hidden sm:inline">Read &amp; write</span>
              </span>
              <span className="hidden text-[#8c8ca5] sm:inline">
                Synced · 8ms
              </span>
            </div>
          </div>

          {/* Interactive Code Editor (Alex) */}
          <div className="relative flex min-h-0 flex-1 overflow-hidden font-mono text-xs">
            {/* Line Numbers */}
            <div className="w-10 shrink-0 space-y-1 border-r border-[#20202b] bg-[#0b0b12] py-4 pr-2 text-right text-[#55556c] select-none">
              {remoteCode.split("\n").map((_, i) => (
                <div
                  key={i}
                  className={`h-5 text-[11px] ${i + 1 === 16 ? "text-[#0DF5C4] font-bold" : ""}`}
                >
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Editable Content */}
            <div className="relative flex-1 overflow-auto bg-[#09090f] p-4 sm:p-5">
              {!remoteCode && (
                <div className="pointer-events-none absolute left-5 top-6 z-0 max-w-xs sm:left-7 sm:top-8">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-[#6C63FF]/25 bg-[#6C63FF]/10 text-[#aaa4ff]">
                    <Code2 className="h-5 w-5" />
                  </div>
                  <div className="text-sm font-medium text-[#d0d0df]">
                    Your editor is ready
                  </div>
                  <p className="mt-1.5 text-xs leading-5 text-[#77778f]">
                    When Ahmed opens a file, it will appear here for both of you
                    to edit.
                  </p>
                </div>
              )}
              <textarea
                value={remoteCode}
                onChange={(e) =>
                  handleRemoteCodeChange(
                    e.target.value,
                    e.target.selectionStart,
                    e.target.selectionEnd,
                  )
                }
                spellCheck={false}
                aria-label="Your shared workspace editor"
                className="relative z-10 h-full w-full resize-none bg-transparent font-mono text-xs leading-6 text-[#d8d8e8] selection:bg-[#6C63FF]/30 focus:outline-none select-text"
              />
            </div>
          </div>
        </section>

        {/* Right Pane: AHMED'S SCREEN */}
        <section className="flex min-h-0 flex-col overflow-hidden bg-[#09090f]">
          {/* Sub-Header */}
          <div className="flex min-h-11 shrink-0 items-center justify-between gap-3 border-b border-[#242432] bg-[#11111a] px-3 sm:px-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="shrink-0 text-xs font-semibold text-[#d8d8e8]">
                Ahmed&apos;s screen
              </span>

              <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
                <span className="flex shrink-0 items-center gap-1 rounded-md border border-[#303040] bg-[#191923] px-2.5 py-1.5 font-mono text-[11px] font-medium text-white">
                  <span className="text-[#FF9E64]">JS</span> index.js
                </span>
              </div>

              {/* Typing indicator */}
              {ahmedTyping && (
                <div className="flex shrink-0 items-center gap-1.5 text-[10px] text-[#FFAE80] sm:text-[11px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FF9E64]" />
                  <span className="hidden sm:inline">Ahmed is typing</span>
                </div>
              )}
            </div>

            <div className="hidden shrink-0 items-center gap-2 font-mono text-[10px] text-[#85859e] lg:flex">
              <Monitor className="h-3.5 w-3.5" />
              <span>Mirroring · 60 FPS</span>
            </div>
          </div>

          {/* Mirrored Code Display */}
          <div className="relative flex min-h-0 flex-1 overflow-hidden font-mono text-xs">
            {/* Line Numbers */}
            <div className="w-10 shrink-0 space-y-1 border-r border-[#20202b] bg-[#0b0b12] py-4 pr-2 text-right text-[#55556c] select-none">
              {remoteCode.split("\n").map((_, i) => (
                <div
                  key={i}
                  className={`h-5 text-[11px] ${i + 1 === 16 ? "text-[#FF9E64] font-bold" : ""}`}
                >
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Read-Only Mirrored Screen */}
            <div className="relative flex-1 overflow-auto bg-[#09090f] p-4 sm:p-5">
              {!remoteCode ? (
                <div className="max-w-xs">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-[#FF9E64]/25 bg-[#FF9E64]/10 text-[#FFAE80]">
                    <Monitor className="h-5 w-5" />
                  </div>
                  <div className="text-sm font-medium text-[#d0d0df]">
                    Waiting for Ahmed&apos;s screen
                  </div>
                  <p className="mt-1.5 text-xs leading-5 text-[#77778f]">
                    The host&apos;s open file and cursor will show here as soon
                    as they connect.
                  </p>
                </div>
              ) : (
                <pre className="font-mono text-xs leading-6 text-[#d8d8e8] select-text">
                  <code>{remoteCode}</code>
                </pre>
              )}
            </div>
          </div>
        </section>
      </div>

      <footer className="z-20 flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[#242432] bg-[#101018] px-3 py-2 sm:px-5">
        {/* Left Controls: Mic, Camera, Release Control */}
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <button
            type="button"
            aria-label={
              isRemoteMuted ? "Turn microphone on" : "Mute microphone"
            }
            onClick={() => setIsRemoteMuted((prev) => !prev)}
            className={`flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs transition-colors ${
              isRemoteMuted
                ? "border-[#343444] bg-[#191923] text-[#b0b0c4]"
                : "border-[#0DF5C4]/30 bg-[#0DF5C4]/10 text-[#0DF5C4]"
            }`}
          >
            {isRemoteMuted ? (
              <MicOff className="w-3.5 h-3.5" />
            ) : (
              <Mic className="w-3.5 h-3.5" />
            )}
            <span>{isRemoteMuted ? "Unmute" : "Mute"}</span>
          </button>

          <button
            type="button"
            aria-label={isRemoteCameraOn ? "Turn camera off" : "Turn camera on"}
            onClick={() => setIsRemoteCameraOn((prev) => !prev)}
            className={`flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs transition-colors ${
              isRemoteCameraOn
                ? "border-[#343444] bg-[#191923] text-[#b0b0c4]"
                : "border-[#FF9E64]/30 bg-[#FF9E64]/10 text-[#FFAE80]"
            }`}
          >
            {isRemoteCameraOn ? (
              <Video className="w-3.5 h-3.5 text-[#0DF5C4]" />
            ) : (
              <VideoOff className="w-3.5 h-3.5" />
            )}
            <span>Camera {isRemoteCameraOn ? "on" : "off"}</span>
          </button>

          <button
            type="button"
            aria-label={
              isRemoteControlling
                ? "Release workspace control"
                : "Request workspace control"
            }
            onClick={() => setIsRemoteControlling((prev) => !prev)}
            className={`flex min-h-10 items-center gap-2 rounded-lg px-3.5 text-xs font-semibold transition-colors ${isRemoteControlling ? "text-[#09090e] hover:brightness-110" : "border border-[#343444] bg-[#191923] text-white hover:bg-[#22222d]"}`}
            style={
              isRemoteControlling
                ? { backgroundColor: theme.primary }
                : undefined
            }
          >
            {isRemoteControlling ? (
              <Lock className="h-3.5 w-3.5" />
            ) : (
              <Unlock className="h-3.5 w-3.5" />
            )}
            <span>
              {isRemoteControlling ? "Release control" : "Request control"}
            </span>
          </button>

          <label className="hidden items-center gap-2 border-l border-[#29293a] pl-3 text-xs text-[#a0a0b5] lg:flex">
            <input
              type="checkbox"
              defaultChecked
              className="rounded accent-[#6C63FF]"
            />
            <span>Follow Ahmed&apos;s Scroll</span>
          </label>
        </div>

        {/* Right Controls: Share Terminal, Chat, Stream Quality */}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              void friendlyAlert("Terminal sharing enabled. Port 8080 forwarded.")
            }
            className="hidden min-h-10 items-center gap-2 rounded-lg border border-[#343444] bg-[#191923] px-3 text-xs text-[#c4c4dc] transition-colors hover:bg-[#22222d] hover:text-white sm:flex"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Share Terminal</span>
          </button>

          <button
            type="button"
            onClick={() => setPage("chat")}
            className="flex min-h-10 items-center gap-2 rounded-lg border border-[#343444] bg-[#191923] px-3 text-xs text-white transition-colors hover:bg-[#22222d]"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#6C63FF]" />
            <span>Chat</span>
            <span className="rounded-full bg-[#6C63FF] px-1.5 py-0.5 text-[10px] font-bold text-white">
              2
            </span>
          </button>

          <div className="hidden 2xl:flex items-center gap-3 border-l border-[#29293a] pl-3 font-mono text-[10px] text-[#8d8da5]">
            <span>4K · 60 FPS</span>
            <span className="text-[#0DF5C4]">Loss 0.0% · 18.4 Mbps</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
