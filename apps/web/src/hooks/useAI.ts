"use client";

import { useCallback, useEffect, useState } from "react";
import type { AIChatParams, AIUsage } from "../services/ai.service";
import { useBrowserServices } from "./useBrowserServices";

export function useAI() {
  const { services, loading: servicesLoading, error: servicesError } = useBrowserServices();
  const [usage, setUsage] = useState<AIUsage | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refreshUsage = useCallback(async () => {
    if (!services || !services.auth.getCurrentUserId()) {
      setUsage(null);
      return;
    }
    try {
      setUsage(await services.ai.getUsage());
      setError(null);
    } catch (reason) {
      const nextError = reason instanceof Error ? reason : new Error("Could not load AI usage.");
      setError(nextError);
      throw nextError;
    }
  }, [services]);

  useEffect(() => {
    if (!services) return;
    void refreshUsage().catch(() => undefined);
  }, [refreshUsage, services]);

  const chat = useCallback(async (params: AIChatParams): Promise<void> => {
    if (!services) throw new Error("Browser services are not ready.");
    setIsStreaming(true);
    setError(null);
    let failed = false;
    try {
      await services.ai.chat({
        ...params,
        onError: (code, message) => {
          failed = true;
          setError(new Error(`${code}: ${message}`));
          params.onError(code, message);
        },
      });
      if (!failed) await refreshUsage();
    } catch (reason) {
      const nextError = reason instanceof Error ? reason : new Error("AI request failed.");
      setError(nextError);
      throw nextError;
    } finally {
      setIsStreaming(false);
    }
  }, [refreshUsage, services]);

  return {
    chat,
    usage,
    refreshUsage,
    isStreaming,
    loading: servicesLoading,
    error: error ?? servicesError,
  };
}
