"use client";

import { useEffect, useState } from "react";
import { BrowserServices } from "../lib/browser-services";

export interface BrowserServicesState {
  services: BrowserServices | null;
  loading: boolean;
  error: Error | null;
}

export function useBrowserServices(): BrowserServicesState {
  const [state, setState] = useState<BrowserServicesState>({
    services: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;
    void BrowserServices.getInstance().then(
      (services) => {
        if (active) setState({ services, loading: false, error: null });
      },
      (reason: unknown) => {
        if (!active) return;
        setState({
          services: null,
          loading: false,
          error: reason instanceof Error ? reason : new Error("Browser services failed to initialize."),
        });
      },
    );
    return () => {
      active = false;
    };
  }, []);

  return state;
}
