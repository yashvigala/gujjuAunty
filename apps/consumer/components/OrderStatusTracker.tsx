// The delivery journey a paid order walks through, in order. `pending_payment`
// and `cancelled` are deliberately NOT here — they're dead ends, not stages.
const STAGES = [
  { key: "paid", label: "Order confirmed", note: "We've received your payment" },
  { key: "processing", label: "Packed", note: "Your snacks are being packed" },
  { key: "shipped", label: "In transit", note: "On the way to your city" },
  { key: "out_for_delivery", label: "Out for delivery", note: "Arriving today" },
  { key: "delivered", label: "Delivered", note: "Enjoy!" },
] as const;

export function OrderStatusTracker({ status }: { status: string }) {
  const currentIndex = STAGES.findIndex((s) => s.key === status);
  // Not on the delivery path (awaiting payment or cancelled) — nothing to track.
  if (currentIndex === -1) return null;

  return (
    <ol className="flex flex-col">
      {STAGES.map((stage, index) => {
        const done = index <= currentIndex;
        const isCurrent = index === currentIndex;
        const isLast = index === STAGES.length - 1;

        return (
          <li key={stage.key} className="flex gap-3">
            {/* Rail: dot + connecting line */}
            <div className="flex flex-col items-center">
              <span
                className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                  done
                    ? "border-green-600 bg-green-600 dark:border-green-500 dark:bg-green-500"
                    : "border-zinc-300 bg-transparent dark:border-zinc-700"
                }`}
              >
                {done && (
                  <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-white">
                    <path
                      d="M2 6.5 4.5 9 10 3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              {!isLast && (
                <span
                  className={`w-0.5 flex-1 ${
                    index < currentIndex
                      ? "bg-green-600 dark:bg-green-500"
                      : "bg-zinc-200 dark:bg-zinc-800"
                  }`}
                />
              )}
            </div>

            <div className={isLast ? "pb-0" : "pb-6"}>
              <p
                className={`text-sm ${
                  isCurrent
                    ? "font-semibold"
                    : done
                      ? "font-medium"
                      : "text-zinc-400 dark:text-zinc-600"
                }`}
              >
                {stage.label}
              </p>
              {done && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {stage.note}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
