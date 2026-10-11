const ports = new Set();
const presenceByPort = new Map();
const PRESENCE_TIMEOUT_MS = 45_000;

self.onconnect = (event) => {
  const port = event.ports[0];
  ports.add(port);
  presenceByPort.set(port, new Map());

  port.onmessage = ({ data }) => {
    if (!data || typeof data !== "object") return;

    if (data.type === "presence:set" && isPresencePayload(data.payload)) {
      const { userId, status, at } = data.payload;
      const userPresence = presenceByPort.get(port);
      if (status === "offline") userPresence.delete(userId);
      else if (status === "online" || status === "away") {
        userPresence.set(userId, { status, updatedAt: at || Date.now() });
      }
      broadcastPresence();
      return;
    }

    if (data.type === "presence:get") {
      port.postMessage({ type: "presence:update", payload: getPresenceSnapshot() });
    }
  };

  port.onmessageerror = () => removePort(port);
  port.start();
  port.postMessage({ type: "presence:update", payload: getPresenceSnapshot() });
};

function isPresencePayload(value) {
  return typeof value === "object"
    && value !== null
    && typeof value.userId === "string"
    && ["online", "away", "offline"].includes(value.status);
}

function removePort(port) {
  if (!ports.delete(port)) return;
  presenceByPort.delete(port);
  broadcastPresence();
}

function getPresenceSnapshot() {
  const snapshot = {};
  const now = Date.now();
  for (const entries of presenceByPort.values()) {
    for (const [userId, presence] of entries) {
      if (now - presence.updatedAt > PRESENCE_TIMEOUT_MS) {
        entries.delete(userId);
        continue;
      }
      if (snapshot[userId] !== "online") snapshot[userId] = presence.status;
    }
  }
  return snapshot;
}

function broadcastPresence() {
  const message = { type: "presence:update", payload: getPresenceSnapshot() };
  for (const port of ports) {
    try {
      port.postMessage(message);
    } catch {
      removePort(port);
    }
  }
}

setInterval(broadcastPresence, 15_000);
