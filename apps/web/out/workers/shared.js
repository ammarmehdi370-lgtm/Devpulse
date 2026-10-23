const ports = new Set();
const presenceByPort = new Map();
const PRESENCE_TIMEOUT_MS = 45_000;

self.onconnect = (event) => {
  const port = event.ports[0];
  ports.add(port);
  presenceByPort.set(port, new Map());

  port.onmessage = ({ data }) => {
    if (!data || typeof data !== "object") return;

    if (data.type === "presence:set" && typeof data.userId === "string") {
      const users = presenceByPort.get(port);
      if (data.status === "offline") users.delete(data.userId);
      else if (data.status === "online" || data.status === "away") {
        users.set(data.userId, { status: data.status, updatedAt: Date.now() });
      }
      broadcastPresence();
      return;
    }

    if (data.type === "presence:get") {
      port.postMessage({ type: "presence:snapshot", users: getPresenceSnapshot() });
    }
  };

  port.onmessageerror = () => removePort(port);
  port.start();
  port.postMessage({ type: "presence:snapshot", users: getPresenceSnapshot() });
};

function removePort(port) {
  if (!ports.delete(port)) return;
  presenceByPort.delete(port);
  broadcastPresence();
}

function getPresenceSnapshot() {
  const users = {};
  const now = Date.now();
  for (const entries of presenceByPort.values()) {
    for (const [userId, presence] of entries) {
      if (now - presence.updatedAt > PRESENCE_TIMEOUT_MS) {
        entries.delete(userId);
        continue;
      }
      if (users[userId] !== "online") users[userId] = presence.status;
    }
  }
  return users;
}

function broadcastPresence() {
  const message = { type: "presence:snapshot", users: getPresenceSnapshot() };
  for (const port of ports) port.postMessage(message);
}

setInterval(broadcastPresence, 15_000);
