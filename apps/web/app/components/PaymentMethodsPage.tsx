"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CreditCard,
  Info,
  Landmark,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import {
  BILLING_METHOD_KEY,
  PAYMENT_METHODS,
  PaymentMethod,
  readPaymentMethod,
} from "./BillingStorage";

const methods: {
  id: PaymentMethod;
  icon: typeof CreditCard;
  accent: string;
  badge?: string;
}[] = [
  { id: "card", icon: CreditCard, accent: "text-ide-accent", badge: "Popular" },
  { id: "paypal", icon: WalletCards, accent: "text-ide-secondary" },
  { id: "bank-transfer", icon: Landmark, accent: "text-ide-warm-accent" },
];

export const PaymentMethodsPage: React.FC = () => {
  const { billingCycle, setPage } = useApp();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("card");
  const [savedMethod, setSavedMethod] = useState<PaymentMethod | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const saved = readPaymentMethod(
        window.localStorage.getItem(BILLING_METHOD_KEY),
      );
      setSavedMethod(saved);
      if (saved) setSelectedMethod(saved);
    } catch (storageError) {
      console.error("Unable to load the saved payment preference.", storageError);
      setError("Your saved payment preference could not be loaded.");
    }
  }, []);

  const savePaymentPreference = () => {
    try {
      window.localStorage.setItem(BILLING_METHOD_KEY, selectedMethod);
      setSavedMethod(selectedMethod);
      setNotice(
        `${PAYMENT_METHODS[selectedMethod].label} saved as your preferred method on this device.`,
      );
      setError("");
    } catch (storageError) {
      console.error("Unable to save the payment preference.", storageError);
      setError("The preference could not be saved on this device. Please try again.");
      setNotice("");
    }
  };

  const monthlyPrice = billingCycle === "annual" ? 15 : 19;
  return (
    <div className="min-h-full bg-ide-app-content-bg px-4 py-6 text-ide-text sm:px-7 sm:py-9">
      <div className="mx-auto max-w-6xl space-y-6">
        <button
          type="button"
          onClick={() => setPage("pricing")}
          className="inline-flex items-center gap-2 rounded-lg text-xs font-semibold text-ide-text-soft transition hover:text-ide-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to plans
        </button>

        <header className="relative overflow-hidden rounded-[28px] border border-ide-border bg-gradient-to-br from-ide-surface-raised via-ide-topbar-bg to-ide-bg p-6 shadow-[0_28px_80px_color-mix(in_srgb,var(--ide-color-shadow-strong)_68%,transparent),inset_0_1px_0_var(--ide-color-border)] sm:p-9">
          <div className="pointer-events-none absolute -right-12 -top-24 h-72 w-72 rounded-full bg-ide-accent/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-[-6rem] left-[42%] h-52 w-52 rounded-full bg-ide-secondary/10 blur-3xl" />
          <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-ide-accent/20 bg-ide-accent/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-ide-success">
                <Sparkles className="h-3.5 w-3.5" />
                Pro · trial checkout
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-ide-text-strong sm:text-4xl">
                Choose a payment method
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-ide-text-body">
                Select how you would prefer to pay for Devpulse Pro. You can
                review this choice in Settings at any time.
              </p>
            </div>
            <div className="min-w-[210px] rounded-2xl border border-ide-border bg-ide-input-bg p-4 shadow-[inset_0_1px_0_var(--ide-color-border)]">
              <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-ide-text-tertiary">
                Pro plan pricing
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-3xl font-bold tracking-tight text-ide-text-strong">
                  ${monthlyPrice}
                </span>
                <span className="text-xs text-ide-text-soft">/ month</span>
              </div>
              <p className="mt-1 text-[10px] leading-4 text-ide-text-tertiary">
                {billingCycle === "annual"
                  ? "Billed annually · $180 total"
                  : "Billed monthly"}
              </p>
            </div>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-ide-danger/25 bg-ide-danger/[0.07] px-4 py-3 text-xs text-ide-danger"
          >
            {error}
          </div>
        )}
        {notice && (
          <div
            role="status"
            className="rounded-xl border border-ide-success/20 bg-ide-success/[0.06] px-4 py-3 text-xs text-ide-success"
          >
            {notice}
          </div>
        )}

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section
            aria-labelledby="method-heading"
            className="rounded-3xl border border-ide-border bg-gradient-to-br from-ide-surface to-ide-panel p-5 shadow-[0_18px_48px_var(--ide-color-shadow-panel),inset_0_1px_0_color-mix(in_srgb,var(--ide-color-text-strong)_4%,transparent)] sm:p-7"
          >
            <div className="mb-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-ide-text-tertiary">
                Payment preference
              </p>
              <h2
                id="method-heading"
                className="mt-1 text-lg font-bold text-ide-text-strong"
              >
                Select a method
              </h2>
              <p className="mt-1 text-xs leading-5 text-ide-text-soft">
                Choose an option to save as your preferred billing method.
              </p>
            </div>

            <div className="space-y-3">
              {methods.map(({ id, icon: Icon, accent, badge }) => {
                const selected = selectedMethod === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      setSelectedMethod(id);
                      setNotice("");
                      setError("");
                    }}
                    className={`group flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring ${
                      selected
                        ? "border-ide-accent/35 bg-gradient-to-r from-ide-accent/[0.09] to-ide-accent/[0.025] shadow-[0_10px_28px_var(--ide-color-shadow-card),0_0_24px_color-mix(in_srgb,var(--ide-color-accent)_5%,transparent)]"
                        : "border-ide-border bg-ide-input-bg hover:border-ide-border-strong hover:bg-ide-hover"
                    }`}
                  >
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-ide-border bg-ide-hover ${accent}`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ide-text-strong">
                        {PAYMENT_METHODS[id].label}
                        {badge && (
                          <span className="rounded-full border border-ide-accent/20 bg-ide-accent/[0.07] px-2 py-0.5 text-[9px] font-semibold text-ide-success">
                            {badge}
                          </span>
                        )}
                      </span>
                      <span className="mt-1 block text-[11px] text-ide-text-tertiary">
                        {PAYMENT_METHODS[id].detail}
                      </span>
                    </span>
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        selected
                          ? "border-ide-accent bg-ide-accent text-ide-accent-fg"
                          : "border-ide-border-strong text-transparent"
                      }`}
                    >
                      {selected && <Check className="h-3.5 w-3.5" />}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex items-start gap-3 rounded-xl border border-ide-border-subtle bg-ide-input-bg p-3.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-ide-info" />
              <p className="text-[10px] leading-5 text-ide-text-soft">
                This preview saves only your method preference on this device.
                It does not collect card or bank details, process payments, or
                activate a subscription.
              </p>
            </div>

            <button
              type="button"
              onClick={savePaymentPreference}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-ide-accent px-5 text-sm font-bold text-ide-accent-fg shadow-[0_12px_28px_color-mix(in_srgb,var(--ide-color-accent)_15%,transparent)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-ide-panel sm:w-auto"
            >
              {savedMethod === selectedMethod ? "Update preference" : "Save preference"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </section>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-ide-border bg-gradient-to-br from-ide-surface-raised to-ide-panel p-5 shadow-ide-shadow-panel">
              <div className="flex items-center gap-2 text-ide-success">
                <ShieldCheck className="h-4 w-4" />
                <h2 className="text-xs font-bold text-ide-text-strong">Your selection</h2>
              </div>
              <div className="mt-4 rounded-xl border border-ide-border-subtle bg-ide-input-bg p-3.5">
                <p className="text-[10px] uppercase tracking-[0.12em] text-ide-muted">
                  Preferred method
                </p>
                <p className="mt-1.5 text-sm font-semibold text-ide-text-strong">
                  {PAYMENT_METHODS[selectedMethod].label}
                </p>
                <p className="mt-1 text-[10px] text-ide-text-soft">
                  {PAYMENT_METHODS[selectedMethod].detail}
                </p>
              </div>
              {savedMethod && (
                <p className="mt-3 text-[10px] leading-4 text-ide-text-tertiary">
                  Saved preference: {PAYMENT_METHODS[savedMethod].label}
                </p>
              )}
              <div className="mt-4 flex items-center gap-2 border-t border-ide-border-subtle pt-4 text-[10px] text-ide-text-soft">
                <LockKeyhole className="h-3.5 w-3.5 text-ide-info" />
                No financial credentials are stored
              </div>
            </section>

            <section className="rounded-2xl border border-ide-warning/15 bg-ide-warning/[0.04] p-4">
              <div className="flex items-start gap-2.5">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-ide-warning" />
                <p className="text-[10px] leading-5 text-ide-text-body">
                  Payments are not enabled yet. Saving a preference here is a
                  local preview only; no payment will be taken and no trial
                  will be started.
                </p>
              </div>
            </section>

            <button
              type="button"
              onClick={() => setPage("settings")}
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-ide-border bg-ide-input-bg px-4 text-xs font-semibold text-ide-text-secondary transition hover:bg-ide-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
            >
              Manage billing in Settings
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
};
