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
  { id: "card", icon: CreditCard, accent: "text-[#0DF5C4]", badge: "Popular" },
  { id: "paypal", icon: WalletCards, accent: "text-[#a99fff]" },
  { id: "bank-transfer", icon: Landmark, accent: "text-[#ffb27e]" },
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
    <div className="min-h-full bg-[#08080d] px-4 py-6 text-[#e8e8f1] sm:px-7 sm:py-9">
      <div className="mx-auto max-w-6xl space-y-6">
        <button
          type="button"
          onClick={() => setPage("pricing")}
          className="inline-flex items-center gap-2 rounded-lg text-xs font-semibold text-[#9b9bad] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0DF5C4]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to plans
        </button>

        <header className="relative overflow-hidden rounded-[28px] border border-white/[0.09] bg-gradient-to-br from-[#1b2024] via-[#11161a] to-[#0d0e14] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-9">
          <div className="pointer-events-none absolute -right-12 -top-24 h-72 w-72 rounded-full bg-[#0DF5C4]/[0.09] blur-3xl" />
          <div className="pointer-events-none absolute bottom-[-6rem] left-[42%] h-52 w-52 rounded-full bg-[#6C63FF]/[0.08] blur-3xl" />
          <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#0DF5C4]/20 bg-[#0DF5C4]/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#75ead1]">
                <Sparkles className="h-3.5 w-3.5" />
                Pro · trial checkout
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Choose a payment method
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#a1a3ad]">
                Select how you would prefer to pay for Devpulse Pro. You can
                review this choice in Settings at any time.
              </p>
            </div>
            <div className="min-w-[210px] rounded-2xl border border-white/[0.09] bg-black/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#7f8490]">
                Pro plan pricing
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-3xl font-bold tracking-tight text-white">
                  ${monthlyPrice}
                </span>
                <span className="text-xs text-[#9295a1]">/ month</span>
              </div>
              <p className="mt-1 text-[10px] leading-4 text-[#8d909b]">
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
            className="rounded-xl border border-rose-400/25 bg-rose-400/[0.07] px-4 py-3 text-xs text-rose-100"
          >
            {error}
          </div>
        )}
        {notice && (
          <div
            role="status"
            className="rounded-xl border border-[#0DF5C4]/20 bg-[#0DF5C4]/[0.06] px-4 py-3 text-xs text-[#b8f6e9]"
          >
            {notice}
          </div>
        )}

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section
            aria-labelledby="method-heading"
            className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#15151e] to-[#101016] p-5 shadow-[0_18px_48px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.035)] sm:p-7"
          >
            <div className="mb-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#7e82a0]">
                Payment preference
              </p>
              <h2
                id="method-heading"
                className="mt-1 text-lg font-bold text-white"
              >
                Select a method
              </h2>
              <p className="mt-1 text-xs leading-5 text-[#9293a3]">
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
                    className={`group flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0DF5C4] ${
                      selected
                        ? "border-[#0DF5C4]/35 bg-gradient-to-r from-[#0DF5C4]/[0.09] to-[#0DF5C4]/[0.025] shadow-[0_10px_28px_rgba(0,0,0,0.22),0_0_24px_rgba(13,245,196,0.045)]"
                        : "border-white/[0.075] bg-black/[0.12] hover:border-white/[0.14] hover:bg-white/[0.025]"
                    }`}
                  >
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] ${accent}`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
                        {PAYMENT_METHODS[id].label}
                        {badge && (
                          <span className="rounded-full border border-[#0DF5C4]/20 bg-[#0DF5C4]/[0.07] px-2 py-0.5 text-[9px] font-semibold text-[#72e9d0]">
                            {badge}
                          </span>
                        )}
                      </span>
                      <span className="mt-1 block text-[11px] text-[#858796]">
                        {PAYMENT_METHODS[id].detail}
                      </span>
                    </span>
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        selected
                          ? "border-[#0DF5C4] bg-[#0DF5C4] text-[#08110f]"
                          : "border-white/20 text-transparent"
                      }`}
                    >
                      {selected && <Check className="h-3.5 w-3.5" />}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex items-start gap-3 rounded-xl border border-white/[0.06] bg-black/[0.12] p-3.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#aaa4ff]" />
              <p className="text-[10px] leading-5 text-[#9193a2]">
                This preview saves only your method preference on this device.
                It does not collect card or bank details, process payments, or
                activate a subscription.
              </p>
            </div>

            <button
              type="button"
              onClick={savePaymentPreference}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0DF5C4] px-5 text-sm font-bold text-[#071310] shadow-[0_12px_28px_rgba(13,245,196,0.15)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a4ffeb] focus-visible:ring-offset-2 focus-visible:ring-offset-[#121218] sm:w-auto"
            >
              {savedMethod === selectedMethod ? "Update preference" : "Save preference"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </section>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#171720] to-[#101016] p-5 shadow-[0_18px_48px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.035)]">
              <div className="flex items-center gap-2 text-[#0DF5C4]">
                <ShieldCheck className="h-4 w-4" />
                <h2 className="text-xs font-bold text-white">Your selection</h2>
              </div>
              <div className="mt-4 rounded-xl border border-white/[0.07] bg-black/[0.14] p-3.5">
                <p className="text-[10px] uppercase tracking-[0.12em] text-[#777a89]">
                  Preferred method
                </p>
                <p className="mt-1.5 text-sm font-semibold text-white">
                  {PAYMENT_METHODS[selectedMethod].label}
                </p>
                <p className="mt-1 text-[10px] text-[#898b9a]">
                  {PAYMENT_METHODS[selectedMethod].detail}
                </p>
              </div>
              {savedMethod && (
                <p className="mt-3 text-[10px] leading-4 text-[#858796]">
                  Saved preference: {PAYMENT_METHODS[savedMethod].label}
                </p>
              )}
              <div className="mt-4 flex items-center gap-2 border-t border-white/[0.07] pt-4 text-[10px] text-[#888a98]">
                <LockKeyhole className="h-3.5 w-3.5 text-[#8d8aff]" />
                No financial credentials are stored
              </div>
            </section>

            <section className="rounded-2xl border border-amber-300/[0.13] bg-amber-200/[0.035] p-4">
              <div className="flex items-start gap-2.5">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-200/80" />
                <p className="text-[10px] leading-5 text-[#b1a897]">
                  Payments are not enabled yet. Saving a preference here is a
                  local preview only; no payment will be taken and no trial
                  will be started.
                </p>
              </div>
            </section>

            <button
              type="button"
              onClick={() => setPage("settings")}
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.025] px-4 text-xs font-semibold text-[#c8c8d1] transition hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0DF5C4]"
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
