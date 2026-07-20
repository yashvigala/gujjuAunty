const CHECKOUT_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

// Load Razorpay's checkout.js once, on demand. Loading it lazily (instead of in
// the layout) keeps it off every page — only checkout pays the cost.
export function loadRazorpayScript(): Promise<
  NonNullable<Window["Razorpay"]>
> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Razorpay can only load in the browser"));
      return;
    }
    if (window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${CHECKOUT_SCRIPT}"]`
    );
    const script = existing ?? document.createElement("script");

    const onLoad = () => {
      if (window.Razorpay) resolve(window.Razorpay);
      else reject(new Error("Razorpay failed to initialise"));
    };

    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Could not load the payment window")),
      { once: true }
    );

    if (!existing) {
      script.src = CHECKOUT_SCRIPT;
      script.async = true;
      document.body.appendChild(script);
    }
  });
}

export type PaymentResult =
  | { outcome: "paid"; response: RazorpaySuccessResponse }
  | { outcome: "dismissed" }
  | { outcome: "failed"; message: string };

// Open the Razorpay popup and resolve with what happened. Resolving (rather
// than throwing) for dismissal keeps "user changed their mind" out of the
// error path — it isn't a failure.
export function openRazorpayCheckout(options: {
  keyId: string;
  amount: number;
  razorpayOrderId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
}): Promise<PaymentResult> {
  return loadRazorpayScript().then(
    (Razorpay) =>
      new Promise<PaymentResult>((resolve) => {
        let settled = false;
        const settle = (result: PaymentResult) => {
          if (!settled) {
            settled = true;
            resolve(result);
          }
        };

        const instance = new Razorpay({
          key: options.keyId,
          amount: options.amount,
          currency: "INR",
          name: "GujjuAunty",
          description: "Homemade Gujarati snacks",
          order_id: options.razorpayOrderId,
          handler: (response) => settle({ outcome: "paid", response }),
          prefill: {
            name: options.customerName,
            contact: options.customerPhone,
            email: options.customerEmail,
          },
          theme: { color: "#c9772d" },
          modal: { ondismiss: () => settle({ outcome: "dismissed" }) },
        });

        instance.on("payment.failed", (failure) =>
          settle({
            outcome: "failed",
            message: failure.error.description || "Payment failed",
          })
        );

        instance.open();
      })
  );
}
