"use client";

import { io, type Socket } from "socket.io-client";
import { getAccessToken } from "./auth-store";

let socket: Socket | null = null;
let selectedWorkspaceId: string | null = null;

export function getSocket(): Socket | null {
  if (typeof window === "undefined") return null;

  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (!socketUrl) return null;

  if (!socket) {
    socket = io(socketUrl, {
      autoConnect: false,
      transports: ["websocket", "polling"],
      reconnectionAttempts: 3,
      reconnectionDelay: 2000,
      timeout: 5000,
      auth: (callback) => {
        callback({
          token: getAccessToken(),
          workspaceId: selectedWorkspaceId,
        });
      },
    });

    socket.on("connect", () => {
      console.log("[Socket] Connected to server");
    });

    socket.on("connect_error", (error) => {
      console.warn(
        "[Socket] Connection failed:",
        error.message,
        "— using BroadcastChannel instead",
      );
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", reason);
    });
  }

  return socket;
}

export function connectSocket(workspaceId: string, userId: string): void {
  if (!workspaceId || !getAccessToken()) return;
  const currentSocket = getSocket();
  if (!currentSocket) return;
  const previousWorkspaceId = selectedWorkspaceId;
  if (currentSocket.connected && previousWorkspaceId === workspaceId) {
    currentSocket.emit("workspace:join", workspaceId);
    currentSocket.emit("presence:update", { workspaceId, status: "online" });
    return;
  }
  if (currentSocket.connected) {
    if (previousWorkspaceId) currentSocket.emit("workspace:leave", previousWorkspaceId);
    currentSocket.disconnect();
  }
  selectedWorkspaceId = workspaceId;
  currentSocket.auth = {
    token: getAccessToken(),
    workspaceId,
    userId,
  };

  const joinWorkspace = () => {
    currentSocket.emit("workspace:join", workspaceId);
    currentSocket.emit("presence:update", {
      workspaceId,
      status: "online",
    });
    console.log("[Socket] Joined workspace:", workspaceId);
  };

  if (currentSocket.connected) {
    joinWorkspace();
    return;
  }

  currentSocket.once("connect", joinWorkspace);
  currentSocket.connect();
}

export function disconnectSocket(workspaceId: string): void {
  const currentSocket = getSocket();
  if (currentSocket?.connected) {
    currentSocket.emit("workspace:leave", workspaceId);
    currentSocket.emit("presence:update", {
      workspaceId,
      status: "offline",
    });
  }
  selectedWorkspaceId = null;
  if (currentSocket) {
    currentSocket.auth = { token: null, workspaceId: null };
    currentSocket.disconnect();
  }
}

export function onPresenceChanged(
  callback: (data: { workspaceId: string; status: string }) => void,
): () => void {
  const currentSocket = getSocket();
  if (!currentSocket) return () => {};

  currentSocket.on("presence:changed", callback);
  return () => currentSocket.off("presence:changed", callback);
}
