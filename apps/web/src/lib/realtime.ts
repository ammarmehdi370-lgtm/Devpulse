import type { Message } from "./db/schema";

export type DevpulseEventMap = {
  "message:new": { channelId: string; message: Message };
  "message:deleted": { channelId: string; messageId: string };
  "user:typing:start": { channelId: string; userId: string };
  "user:typing:stop": { channelId: string; userId: string };
  "cursor:move": {
    fileId: string;
    userId: string;
    position: { line: number; column: number };
  };
  "file:changed": { fileId: string; projectId: string };
  "presence:update": {
    userId: string;
    status: "online" | "away" | "offline";
    at: number;
  };
  "session:sync": { userId: string; updatedAt: number };
};

export type DevpulseEventType = keyof DevpulseEventMap;

interface BroadcastEnvelope {
  type: DevpulseEventType;
  payload: DevpulseEventMap[DevpulseEventType];
  senderId: string;
  senderTabId: string;
  timestamp: number;
}

type EventHandler<Type extends DevpulseEventType> = (
  payload: DevpulseEventMap[Type],
) => void;

function isEventEnvelope(value: unknown): value is BroadcastEnvelope {
  if (typeof value !== "object" || value === null) return false;
  const event = value as Partial<BroadcastEnvelope>;
  return typeof event.type === "string"
    && Object.hasOwn({
      "message:new": true,
      "message:deleted": true,
      "user:typing:start": true,
      "user:typing:stop": true,
      "cursor:move": true,
      "file:changed": true,
      "presence:update": true,
      "session:sync": true,
    }, event.type)
    && "payload" in event
    && typeof event.senderTabId === "string";
}

export class RealtimeService {
  private static readonly tabId = crypto.randomUUID();
  private readonly channel: BroadcastChannel;
  private readonly worker: SharedWorker | null;
  private sourceId: string;
  private readonly handlers = new Map<DevpulseEventType, Set<(payload: never) => void>>();
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
            const payload = data.payload as Record<string, string>;
            this.presenceListeners.forEach((listener) => listener(payload));
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

  on<Type extends DevpulseEventType>(
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

  emit<Type extends DevpulseEventType>(
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
    } as BroadcastEnvelope;
    this.dispatch(type, payload);
    this.channel.postMessage(event);
    if (type === "presence:update") {
      this.worker?.port.postMessage({ type: "presence:set", payload });
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

  sendMessage(channelId: string, message: Message): void {
    this.emit("message:new", { channelId, message });
  }

  sendTypingStart(channelId: string): void {
    this.emit("user:typing:start", { channelId, userId: this.sourceId });
  }

  sendTypingStop(channelId: string): void {
    this.emit("user:typing:stop", { channelId, userId: this.sourceId });
  }

  updatePresence(status: "online" | "away" | "offline"): void {
    this.emit("presence:update", { userId: this.sourceId, status, at: Date.now() });
  }

  moveCursor(fileId: string, position: { line: number; column: number }): void {
    this.emit("cursor:move", { fileId, userId: this.sourceId, position });
  }

  close(): void {
    this.destroy();
  }

  destroy(): void {
    if (this.closed) return;
    this.closed = true;
    this.worker?.port.postMessage({
      type: "presence:set",
      payload: { userId: this.sourceId, status: "offline", at: Date.now() },
    });
    this.channel.close();
    this.worker?.port.close();
    this.handlers.clear();
    this.presenceListeners.clear();
  }

  private dispatch<Type extends DevpulseEventType>(
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
