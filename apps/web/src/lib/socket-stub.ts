// Socket.IO compatibility for browser-only deployments. Cross-device presence
// requires a Socket.IO server configured through NEXT_PUBLIC_SOCKET_URL.
export interface SocketStub {
  emit: (event: string, data?: unknown) => void;
  on: (event: string, handler: (...args: unknown[]) => void) => () => void;
  disconnect: () => void;
  connected: false;
}

export function getSocketStub(): SocketStub {
  return {
    emit: (event, data) => {
      if (process.env.NODE_ENV === "development") {
        console.debug("[Socket stub]", event, data);
      }
    },
    on: (_event, _handler) => () => {},
    disconnect: () => {},
    connected: false,
  };
}

export const socket = getSocketStub();
