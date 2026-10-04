export type PaymentMethod = "card" | "paypal" | "bank-transfer";

export const BILLING_METHOD_KEY = "devpulse_billing_method";

export const PAYMENT_METHODS: Record<
  PaymentMethod,
  { label: string; detail: string }
> = {
  card: {
    label: "Credit or debit card",
    detail: "Visa, Mastercard, or American Express",
  },
  paypal: {
    label: "PayPal",
    detail: "Pay with your PayPal account",
  },
  "bank-transfer": {
    label: "Bank transfer",
    detail: "For business and team billing",
  },
};

export const readPaymentMethod = (value: string | null): PaymentMethod | null => {
  if (value === null) return null;
  if (Object.prototype.hasOwnProperty.call(PAYMENT_METHODS, value)) {
    return value as PaymentMethod;
  }
  throw new Error("Saved payment method preference is invalid.");
};
