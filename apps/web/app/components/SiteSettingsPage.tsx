"use client";

import React, { useEffect, useState } from "react";
import {
  Accessibility,
  AlertTriangle,
  CalendarClock,
  Check,
  ChevronRight,
  CreditCard,
  Laptop,
  Moon,
  Palette,
  RotateCcw,
  Settings2,
  Sun,
  HardDriveDownload,
  UserRound,
  UserRoundPlus,
  Trash2,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import {
  BILLING_METHOD_KEY,
  PAYMENT_METHODS,
  PaymentMethod,
  readPaymentMethod,
} from "./BillingStorage";

type UiPreferences = {
  density: "comfortable" | "compact";
  reduceMotion: boolean;
};

const PREFERENCES_KEY = "devpulse_ui_preferences";
const NATIVE_HANDLE_DB = "devpulse-editor-handles";
const DEFAULT_PREFERENCES: UiPreferences = {
  density: "comfortable",
  reduceMotion: false,
};

const readPreferences = (value: string | null): UiPreferences => {
  if (!value) return DEFAULT_PREFERENCES;
  const parsed: unknown = JSON.parse(value);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("density" in parsed) ||
    !("reduceMotion" in parsed) ||
    (parsed.density !== "comfortable" && parsed.density !== "compact") ||
    typeof parsed.reduceMotion !== "boolean"
  ) {
    throw new Error("Saved interface preferences are invalid.");
  }
  return {
    density: parsed.density,
    reduceMotion: parsed.reduceMotion,
  };
};

export const SiteSettingsPage: React.FC = () => {
  const { user, theme, colorMode, setColorMode, setPage, logout } = useApp();
  const [preferences, setPreferences] =
    useState<UiPreferences>(DEFAULT_PREFERENCES);
  const [isHydrated, setIsHydrated] = useState(false);
  const [error, setError] = useState("");
  const [billingError, setBillingError] = useState("");
  const [savedPaymentMethod, setSavedPaymentMethod] =
    useState<PaymentMethod | null>(null);
  const [deletionDialog, setDeletionDialog] = useState<
    "device" | "permanent" | null
  >(null);
  const [isRemovingDeviceData, setIsRemovingDeviceData] = useState(false);
  const [deletionError, setDeletionError] = useState("");

  useEffect(() => {
    try {
      const saved = readPreferences(
        window.localStorage.getItem(PREFERENCES_KEY),
      );
      setPreferences(saved);
      document.documentElement.dataset.uiDensity = saved.density;
      document.documentElement.dataset.reduceMotion = String(
        saved.reduceMotion,
      );
      setIsHydrated(true);
    } catch (storageError) {
      console.error("Unable to load Devpulse settings.", storageError);
      setError("Saved settings could not be loaded. You can still change them for this session.");
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    try {
      setSavedPaymentMethod(
        readPaymentMethod(window.localStorage.getItem(BILLING_METHOD_KEY)),
      );
    } catch (storageError) {
      console.error("Unable to load billing preferences.", storageError);
      setBillingError("Billing preferences could not be loaded from this device.");
    }
  }, []);

  useEffect(() => {
    if (!deletionDialog) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDeletionDialog(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deletionDialog]);

  const removeDeviceData = async () => {
    setIsRemovingDeviceData(true);
    setDeletionError("");
    try {
      await new Promise<void>((resolve, reject) => {
        const request = window.indexedDB.deleteDatabase(NATIVE_HANDLE_DB);
        request.onsuccess = () => resolve();
        request.onerror = () =>
          reject(request.error ?? new Error("Could not remove local file access."));
        request.onblocked = () =>
          reject(new Error("Close other Devpulse tabs, then try again."));
      });
      for (const key of Object.keys(window.localStorage)) {
        if (
          key.startsWith("devpulse_") &&
          key !== "devpulse_logged_out" &&
          key !== "devpulse_active_page"
        ) {
          window.localStorage.removeItem(key);
        }
      }
      for (const key of Object.keys(window.sessionStorage)) {
        if (key.startsWith("devpulse_")) {
          window.sessionStorage.removeItem(key);
        }
      }
      logout();
      window.location.assign("/");
    } catch (storageError) {
      console.error("Unable to remove local Devpulse data.", storageError);
      setDeletionError(
        storageError instanceof Error
          ? storageError.message
          : "Local Devpulse data could not be removed. Please try again.",
      );
      setIsRemovingDeviceData(false);
    }
  };

  const updatePreferences = (next: UiPreferences) => {
    setPreferences(next);
    document.documentElement.dataset.uiDensity = next.density;
    document.documentElement.dataset.reduceMotion = String(next.reduceMotion);
    try {
      window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(next));
      setError("");
    } catch (storageError) {
      console.error("Unable to save Devpulse settings.", storageError);
      setError("Settings changed for this session but could not be saved on this device.");
    }
  };

  const resetPreferences = () => {
    updatePreferences(DEFAULT_PREFERENCES);
    setColorMode("dark");
  };

  return (
    <div className="min-h-full bg-[#08080d] px-4 py-6 text-[#e8e8f1] sm:px-7 sm:py-8 lg:px-10">
      <div className="mx-auto max-w-5xl space-y-7">
        <header className="relative overflow-hidden rounded-3xl border border-white/[0.09] bg-gradient-to-br from-[#171720] via-[#111118] to-[#0d0d14] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.05)] sm:p-8">
          <div className="pointer-events-none absolute -right-14 -top-20 h-56 w-56 rounded-full bg-[#6C63FF]/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#6C63FF]/25 bg-[#6C63FF]/10 text-[#aaa5ff] shadow-[0_8px_24px_rgba(108,99,255,0.14)]">
                <Settings2 className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8d89ff]">
                  Devpulse preferences
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Settings
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-[#9797aa]">
                  Make Devpulse feel right for the way you work. Appearance and
                  interface preferences are saved on this device.
                </p>
              </div>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#0DF5C4]/20 bg-[#0DF5C4]/[0.07] px-3 py-1.5 text-[11px] font-medium text-[#66e8ce]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0DF5C4]" />
              {isHydrated ? "Preferences ready" : "Loading preferences"}
            </span>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-amber-400/25 bg-amber-300/[0.06] px-4 py-3 text-sm text-amber-100"
          >
            {error}
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="contents">
            <section className="settings-panel">
              <div className="settings-section-heading">
                <span className="settings-section-icon">
                  <Sun className="h-4 w-4" />
                </span>
                <div>
                  <h2>Appearance</h2>
                  <p>Choose a comfortable look for your workspace.</p>
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-2.5 flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-[#d9d9e5]">
                    Color mode
                  </h3>
                  <span className="text-[10px] text-[#747487]">
                    Applies across Devpulse
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/[0.06] bg-black/15 p-1.5">
                  {(
                    [
                      { value: "dark", label: "Dark", icon: Moon },
                      { value: "light", label: "Light", icon: Sun },
                    ] as const
                  ).map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={colorMode === value}
                      onClick={() => setColorMode(value)}
                      className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold transition ${
                        colorMode === value
                          ? "border-[#6C63FF]/35 bg-[#6C63FF]/[0.14] text-white shadow-[0_4px_14px_rgba(108,99,255,0.12)]"
                          : "border-transparent text-[#9292a6] hover:bg-white/[0.04] hover:text-white"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                      {colorMode === value && (
                        <Check className="ml-1 h-3.5 w-3.5 text-[#8f88ff]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPage("theme")}
                className="settings-navigation-row mt-5"
              >
                <span className="settings-row-icon text-[#0DF5C4]">
                  <Palette className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <strong>Theme palette</strong>
                  <small>Currently using {theme.name}</small>
                </span>
                <span className="text-[11px] font-medium text-[#aaa5ff]">
                  Customize
                </span>
                <ChevronRight className="h-4 w-4 text-[#77788c]" />
              </button>
            </section>

            <section className="settings-panel">
              <div className="settings-section-heading">
                <span className="settings-section-icon text-[#0DF5C4]">
                  <Laptop className="h-4 w-4" />
                </span>
                <div>
                  <h2>Workspace experience</h2>
                  <p>Adjust density and motion to suit your setup.</p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <div className="mb-2.5 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-semibold text-[#d9d9e5]">
                        Interface density
                      </h3>
                      <p className="mt-1 text-[11px] text-[#77788b]">
                        Choose the spacing used across navigation and controls.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        {
                          value: "comfortable",
                          label: "Comfortable",
                          detail: "More breathing room",
                        },
                        {
                          value: "compact",
                          label: "Compact",
                          detail: "More on screen",
                        },
                      ] as const
                    ).map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={preferences.density === option.value}
                        onClick={() =>
                          updatePreferences({
                            ...preferences,
                            density: option.value,
                          })
                        }
                        className={`rounded-xl border px-3 py-3 text-left transition ${
                          preferences.density === option.value
                            ? "border-[#0DF5C4]/30 bg-[#0DF5C4]/[0.06]"
                            : "border-white/[0.07] bg-black/10 hover:border-white/[0.14]"
                        }`}
                      >
                        <span className="flex items-center justify-between text-xs font-semibold text-white">
                          {option.label}
                          {preferences.density === option.value && (
                            <Check className="h-3.5 w-3.5 text-[#0DF5C4]" />
                          )}
                        </span>
                        <span className="mt-1 block text-[10px] text-[#818194]">
                          {option.detail}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-toggle-row">
                  <span className="settings-row-icon text-[#b4aaff]">
                    <Accessibility className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong>Reduce motion</strong>
                    <small>Limit decorative movement and transitions.</small>
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={preferences.reduceMotion}
                    aria-label="Reduce motion"
                    onClick={() =>
                      updatePreferences({
                        ...preferences,
                        reduceMotion: !preferences.reduceMotion,
                      })
                    }
                    className={`settings-switch ${preferences.reduceMotion ? "settings-switch-on" : ""}`}
                  >
                    <span />
                  </button>
                </div>
              </div>
            </section>
          </div>

          <div className="contents">
            <section className="settings-panel">
              <div className="settings-section-heading">
                <span className="settings-section-icon text-[#ffae7b]">
                  <UserRound className="h-4 w-4" />
                </span>
                <div>
                  <h2>Account</h2>
                  <p>Your signed-in profile.</p>
                </div>
              </div>
              <div className="mt-5 flex items-center gap-3 rounded-xl border border-white/[0.07] bg-black/15 p-3">
                <span className="topbar-avatar h-10 w-10 text-sm">
                  {user.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
                <span className="min-w-0">
                  <strong className="block truncate text-xs text-white">
                    {user.name}
                  </strong>
                  <small className="mt-1 block truncate text-[11px] text-[#88899b]">
                    {user.email}
                  </small>
                </span>
              </div>
              <div className="mt-3 rounded-xl bg-white/[0.025] px-3 py-2.5 text-[10px] uppercase tracking-[0.12em] text-[#77788b]">
                {user.role}
                {user.handle ? ` · @${user.handle}` : ""}
              </div>
              <button
                type="button"
                onClick={() => setPage("account-connections")}
                className="settings-navigation-row mt-3"
              >
                <span className="settings-row-icon text-[#0DF5C4]">
                  <UserRoundPlus className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <strong>Add or link an account</strong>
                  <small>Preview available identity providers</small>
                </span>
                <ChevronRight className="h-4 w-4 text-[#77788c]" />
              </button>
            </section>

            <section className="settings-panel">
              <div className="settings-section-heading">
                <span className="settings-section-icon text-[#9b95ff]">
                  <Settings2 className="h-4 w-4" />
                </span>
                <div>
                  <h2>Preferences</h2>
                  <p>Changes are stored locally in this browser.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={resetPreferences}
                className="settings-navigation-row mt-4"
              >
                <span className="settings-row-icon text-[#ffad81]">
                  <RotateCcw className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <strong>Reset appearance</strong>
                  <small>Restore default density, motion, and dark mode.</small>
                </span>
                <ChevronRight className="h-4 w-4 text-[#77788c]" />
              </button>
              <div className="mt-4 flex items-center gap-2 text-[10px] text-[#737487]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0DF5C4]" />
                Personal preferences · private to this device
              </div>
            </section>

            <section className="settings-panel">
              <div className="settings-section-heading">
                <span className="settings-section-icon text-[#0DF5C4]">
                  <CreditCard className="h-4 w-4" />
                </span>
                <div>
                  <h2>Billing &amp; payment</h2>
                  <p>Plan and preferred payment method.</p>
                </div>
              </div>
              {billingError && (
                <p
                  role="alert"
                  className="mt-3 rounded-lg border border-amber-300/20 bg-amber-200/[0.05] px-3 py-2 text-[10px] text-amber-100"
                >
                  {billingError}
                </p>
              )}
              <dl className="mt-4 space-y-3 rounded-xl border border-white/[0.07] bg-black/15 p-3.5 text-[11px]">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[#858697]">Current plan</dt>
                  <dd className="text-right font-semibold text-white">
                    Free · $0
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[#858697]">Subscription status</dt>
                  <dd className="text-right text-[#a8a9b5]">
                    No active subscription
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[#858697]">Preferred payment method</dt>
                  <dd className="text-right font-medium text-[#d7d7e0]">
                    {savedPaymentMethod
                      ? PAYMENT_METHODS[savedPaymentMethod].label
                      : "Not selected"}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-[10px] leading-5 text-[#828493]">
                Payment setup is a preview only. No payment details or
                subscription charges are processed or stored.
              </p>
              <button
                type="button"
                onClick={() => setPage("payment-methods")}
                className="settings-navigation-row mt-3"
              >
                <span className="settings-row-icon text-[#0DF5C4]">
                  <CreditCard className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <strong>Choose payment method</strong>
                  <small>Review payment options for Devpulse plans</small>
                </span>
                <ChevronRight className="h-4 w-4 text-[#77788c]" />
              </button>
            </section>

            <section className="settings-panel settings-danger-panel">
              <div className="settings-section-heading">
                <span className="settings-section-icon text-[#ff9a9a]">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <div>
                  <h2>Account &amp; data removal</h2>
                  <p>Choose what you want removed.</p>
                </div>
              </div>
              <p className="mt-4 text-[11px] leading-5 text-[#9293a4]">
                Removing data from this device clears Devpulse’s saved browser
                data and signs you out. It does not erase original project files
                from your computer or delete your account.
              </p>
              <button
                type="button"
                onClick={() => {
                  setDeletionError("");
                  setDeletionDialog("device");
                }}
                className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/[0.06] px-3.5 text-xs font-semibold text-red-200 transition hover:border-red-300/40 hover:bg-red-400/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/60"
              >
                <HardDriveDownload className="h-3.5 w-3.5" />
                Remove Devpulse data from this device
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeletionError("");
                  setDeletionDialog("permanent");
                }}
                className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-red-300/25 bg-red-300/[0.035] px-3.5 text-xs font-semibold text-red-100 transition hover:border-red-300/40 hover:bg-red-300/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/60"
              >
                <CalendarClock className="h-3.5 w-3.5" />
                Permanent account deletion · preview
              </button>
              <p className="mt-2 text-[10px] leading-4 text-[#a19a9a]">
                30-day grace-period flow is unavailable until account deletion
                is connected to the server.
              </p>
            </section>
          </div>
        </div>
      </div>

      {deletionError && (
        <div
          role="alert"
          className="fixed bottom-5 left-1/2 z-[60] w-[min(90vw,32rem)] -translate-x-1/2 rounded-xl border border-red-300/25 bg-[#21171c] px-4 py-3 text-sm text-red-100 shadow-2xl"
        >
          {deletionError}
        </div>
      )}

      {deletionDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              if (!isRemovingDeviceData) setDeletionDialog(null);
            }
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="account-deletion-title"
            aria-describedby="account-deletion-description"
            className="w-full max-w-md rounded-2xl border border-red-300/20 bg-gradient-to-br from-[#21171c] to-[#111117] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.6),0_0_28px_rgba(248,113,113,0.08)] sm:p-6"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-300/20 bg-red-300/[0.08] text-red-200">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <h2
              id="account-deletion-title"
              className="mt-4 text-lg font-bold text-white"
            >
              {deletionDialog === "device"
                ? "Remove Devpulse data from this device?"
                : "Permanent account deletion"}
            </h2>
            <p
              id="account-deletion-description"
              className="mt-2 text-sm leading-6 text-[#a3a0ad]"
            >
              {deletionDialog === "device" ? (
                <>
                  This clears saved Devpulse workspace and editor data, settings,
                  saved file snapshots, and folder-access references from this
                  browser, then signs you out. It will <strong className="text-white">not</strong>{" "}
                  delete your original files and folders from the computer or
                  your remote account. Important: this app currently keeps some
                  workspace/editor data only on this device and does not sync
                  those local copies to your account. Anything not already
                  present in your original files may be lost.
                </>
              ) : (
                <>
                  Permanent deletion would remove your account and associated
                  server data after a 30-day grace period. You could cancel
                  during that period. However, account deletion is not connected
                  to a backend in this app, so this option cannot currently
                  schedule a deletion. <strong className="text-white">Nothing will be deleted or scheduled.</strong>
                </>
              )}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={isRemovingDeviceData}
                onClick={() => setDeletionDialog(null)}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-[#c7c7d2] transition hover:bg-white/[0.05]"
              >
                {deletionDialog === "device" ? "Cancel" : "Close"}
              </button>
              {deletionDialog === "device" && (
                <button
                  type="button"
                  disabled={isRemovingDeviceData}
                  onClick={() => void removeDeviceData()}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-300/20 bg-red-400/15 px-4 py-2.5 text-xs font-semibold text-red-100 transition hover:bg-red-400/25 disabled:cursor-wait disabled:opacity-60"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {isRemovingDeviceData ? "Removing data…" : "Remove data and sign out"}
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
