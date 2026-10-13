import type { Message } from "./db/schema";

export type DPEventType =
  | "message:new"
  | "message:deleted"
  | "user:typing:start"
  | "user:typing:stop"
  | "cursor:move"
  | "file:changed"
  | "editor:operation"
  | "presence:update"
  | "session:sync"
  | "devbox:status"
  | "deployment:status"
  | "deployment:log"
  | "huddle:join"
  | "huddle:leave"
  | "huddle:mute"
  | "huddle:camera";

export type DevpulseEventMap = {
  "message:new": {
    channelId: string;
    content: string;
    authorId: string;
    authorName?: string;
    message?: Message;
  };
  "message:deleted": { channelId: string; messageId: string };
  "user:typing:start": { channelId: string; userId: string };
  "user:typing:stop": { channelId: string; userId: string };
  "cursor:move": {
    fileId: string;
    userId: string;
    position: { line: number; column: number };
  };
  "file:changed": { fileId: string; projectId: string };
  "editor:operation": {
    fileId: string;
    userId: string;
    operation: Record<string, unknown>;
  };
  "presence:update": {
    userId: string;
    status: "online" | "away" | "offline";
    at?: number;
    name?: string;
  };
  "session:sync": {
    userId: string;
    updatedAt: number;
    projectId?: string;
    startedAt?: number;
  };
  "devbox:status": { devboxId: string; status: string };
  "deployment:status": { deploymentId: string; status: string };
  "deployment:log": { deploymentId: string; line: string };
  "huddle:join": { userId: string; roomId?: string };
  "huddle:leave": { userId: string; roomId?: string };
  "huddle:mute": { userId: string; muted: boolean; roomId?: string };
  "huddle:camera": { userId: string; enabled: boolean; roomId?: string };
};

export type DevpulseEventType = DPEventType;

interface BroadcastEnvelope {
  type: DPEventType;
  payload: DevpulseEventMap[DPEventType];
  senderId: string;
  senderTabId: string;
  timestamp: number;
}

type EventHandler<Type extends DPEventType> = (
  payload: DevpulseEventMap[Type],
) => void;

const EVENT_TYPES = new Set<DPEventType>([
  "message:new",
  "message:deleted",
  "user:typing:start",
  "user:typing:stop",
  "cursor:move",
  "file:changed",
  "editor:operation",
  "presence:update",
  "session:sync",
  "devbox:status",
  "deployment:status",
  "deployment:log",
  "huddle:join",
  "huddle:leave",
  "huddle:mute",
  "huddle:camera",
]);

function isEventEnvelope(value: unknown): value is BroadcastEnvelope {
  if (typeof value !== "object" || value === null) return false;
  const event = value as Partial<BroadcastEnvelope>;
  return typeof event.type === "string"
    && EVENT_TYPES.has(event.type as DPEventType)
    && "payload" in event
    && typeof event.senderTabId === "string";
}

export class RealtimeService {
  private static readonly tabId = crypto.randomUUID();
  private readonly channel: BroadcastChannel;
  private readonly worker: SharedWorker | null;
  private sourceId: string;
  private readonly handlers = new Map<DPEventType, Set<(payload: never) => void>>();
  private readonly presenceListeners = new Set<(users: Record<string, string>) => void>();
  private closed = false;

  constructor(userId = "anonymous") {
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
      throw new Error("RealtimeService requires browser BroadcastChannel support.");
    }
    this.sourceId = userId;
    this.channel = new BroadcastChannel("devpulse-v1");
    this.channel.onmessage = (event: MessageEvent<unknown>) => {
      if (!isEventEnvelope(event.data) || event.data.senderTabId === RealtimeService.tabId) return;
      this.dispatch(event.data.type, event.data.payload);
    };

    if (typeof SharedWorker !== "undefined") {
      try {
        this.worker = new SharedWorker("/workers/devpulse-shared.js", {
          name: "devpulse-shared",
        });
        this.worker.port.onmessage = (event: MessageEvent<unknown>) => {
          const data = event.data as {
            type?: string;
            payload?: unknown;
          } | null;
          if (data?.type === "presence:update" && isPresenceSnapshot(data.payload)) {
            this.presenceListeners.forEach((listener) => listener(data.payload as Record<string, string>));
          }
        };
        this.worker.port.start();
      } catch (error) {
        console.warn("SharedWorker unavailable; BroadcastChannel events remain available.", error);
        this.worker = null;
      }
    } else {
      this.worker = null;
    }
  }

  on<Type extends DPEventType>(
    type: Type,
    handler: EventHandler<Type>,
  ): () => void {
    this.assertOpen();
    let listeners = this.handlers.get(type);
    if (!listeners) {
      listeners = new Set();
      this.handlers.set(type, listeners);
    }
    const listener = handler as (payload: never) => void;
    listeners.add(listener);
    return () => listeners?.delete(listener);
  }

  emit<Type extends DPEventType>(
    type: Type,
    payload: DevpulseEventMap[Type],
  ): void {
    this.assertOpen();
    const event: BroadcastEnvelope = {
      type,
      payload,
      senderId: this.sourceId,
      senderTabId: RealtimeService.tabId,
      timestamp: Date.now(),
    };
    this.dispatch(type, payload);
    this.channel.postMessage(event);
    if (type === "presence:update") {
      const presence = payload as DevpulseEventMap["presence:update"];
      this.worker?.port.postMessage({
        type: "presence:set",
        payload: { ...presence, at: presence.at ?? Date.now() },
      });
    }
  }

  onPresenceChange(listener: (users: Record<string, string>) => void): () => void {
    this.assertOpen();
    this.presenceListeners.add(listener);
    this.worker?.port.postMessage({ type: "presence:get" });
    return () => this.presenceListeners.delete(listener);
  }

  setUserId(userId: string | null): void {
    this.assertOpen();
    if (this.sourceId !== "anonymous") this.updatePresence("offline");
    this.sourceId = userId ?? "anonymous";
    if (userId) this.updatePresence("online");
  }

  sendMessage(channelId: string, message: Message, authorName?: string): void {
    this.emit("message:new", {
      channelId,
      content: message.body,
      authorId: message.authorId,
      authorName,
      message,
    });
  }

  sendTypingStart(channelId: string): void {
    this.emit("user:typing:start", { channelId, userId: this.sourceId });
  }

  sendTypingStop(channelId: string): void {
    this.emit("user:typing:stop", { channelId, userId: this.sourceId });
  }

  updatePresence(status: "online" | "away" | "offline", name?: string): void {
    this.emit("presence:update", {
      userId: this.sourceId,
      status,
      at: Date.now(),
      name,
    });
  }

  moveCursor(fileId: string, position: { line: number; column: number }): void {
    this.emit("cursor:move", { fileId, userId: this.sourceId, position });
  }

  close(): void {
    this.destroy();
  }

  destroy(): void {
    if (this.closed) return;
    if (this.sourceId !== "anonymous") {
      this.emit("presence:update", {
        userId: this.sourceId,
        status: "offline",
        at: Date.now(),
      });
    }
    this.closed = true;
    this.channel.close();
    this.worker?.port.close();
    this.handlers.clear();
    this.presenceListeners.clear();
  }

  private dispatch<Type extends DPEventType>(
    type: Type,
    payload: DevpulseEventMap[Type],
  ): void {
    this.handlers.get(type)?.forEach((handler) => handler(payload as never));
  }

  private assertOpen(): void {
    if (this.closed) throw new Error("RealtimeService has been destroyed.");
  }
}

function isPresenceSnapshot(value: unknown): value is Record<string, string> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
