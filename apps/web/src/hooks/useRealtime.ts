"use client";

import { useMemo } from "react";
import { useBrowserServices } from "./useBrowserServices";

export function useRealtime() {
  const { services, loading, error } = useBrowserServices();
  const realtime = services?.realtime ?? null;

  return useMemo(() => ({
    realtime,
    loading,
    error,
    on: realtime ? realtime.on.bind(realtime) : null,
    emit: realtime ? realtime.emit.bind(realtime) : null,
  }), [error, loading, realtime]);
}
