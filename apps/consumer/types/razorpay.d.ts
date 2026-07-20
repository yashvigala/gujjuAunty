// Razorpay's checkout.js attaches a constructor to `window` at runtime. It
// ships no types, so we declare the slice of its API we actually use — this is
// what keeps the integration free of `any` casts.

interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayFailureResponse {
  error: {
    code: string;
    description: string;
    reason?: string;
  };
}

interface RazorpayOptions {
  key: string; // public Key ID
  amount: number; // paise
  currency: "INR";
  name: string;
  description?: string;
  order_id: string;
  handler: (response: RazorpaySuccessResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open: () => void;
  on: (
    event: "payment.failed",
    handler: (response: RazorpayFailureResponse) => void
  ) => void;
}

interface Window {
  // Optional: only present once checkout.js has finished loading.
  Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
}
