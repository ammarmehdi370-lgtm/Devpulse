"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "../lib/db/schema";
import { useBrowserServices } from "./useBrowserServices";

export function useAuth() {
  const { services, loading: servicesLoading, error: servicesError } = useBrowserServices();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    if (!services) {
      if (!servicesLoading) {
        setError(servicesError);
        setLoading(false);
      }
      return () => { active = false; };
    }

    void services.auth.getCurrentUser().then(
      (currentUser) => {
        if (active) {
          setUser(currentUser);
          setLoading(false);
          setError(null);
        }
      },
      (reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason : new Error("Could not load the local user."));
          setLoading(false);
        }
      },
    );
    return () => { active = false; };
  }, [services, servicesError, servicesLoading]);

  const login = useCallback(async (email?: string) => {
    if (!services) throw new Error("Browser services are not ready.");
    setLoading(true);
    setError(null);
    try {
      const currentUser = await services.auth.devLogin(email);
      setUser(currentUser);
      return currentUser;
    } catch (reason) {
      const nextError = reason instanceof Error ? reason : new Error("Local login failed.");
      setError(nextError);
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, [services]);

  const logout = useCallback(async () => {
    if (!services) throw new Error("Browser services are not ready.");
    setLoading(true);
    setError(null);
    try {
      await services.auth.logout();
      setUser(null);
    } catch (reason) {
      const nextError = reason instanceof Error ? reason : new Error("Local logout failed.");
      setError(nextError);
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, [services]);

  return { user, loading: loading || servicesLoading, error: error ?? servicesError, login, logout };
}
