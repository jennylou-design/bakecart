type OrderProgressProps = {
  status: string;
  fulfillmentType: "pickup" | "delivery";
};

export default function OrderProgress({
  status,
  fulfillmentType,
}: OrderProgressProps) {
  const isPickup = fulfillmentType === "pickup";

  const steps = isPickup
    ? ["Confirmed", "Preparing", "Ready for Pickup", "Completed"]
    : ["Confirmed", "Preparing", "Ready for Delivery", "Out for Delivery", "Completed"];

  if (status === "cancelled") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <p className="font-semibold text-red-800">Order Cancelled</p>
        <p className="mt-1 text-sm text-red-700">
          This order will no longer move through the preparation process.
        </p>
      </div>
    );
  }

  if (status === "pending_payment") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="font-semibold text-amber-900">Awaiting Payment</p>
        <p className="mt-1 text-sm text-amber-800">
          Order progress will begin once payment has been confirmed.
        </p>
      </div>
    );
  }

  const statusIndex: Record<string, number> = {
    pending_confirmation: -1,
    confirmed: 0,
    preparing: 1,
    ready_for_pickup: 2,
    ready_for_delivery: 2,
    out_for_delivery: 3,
    delivery_failed: 3,
    completed: steps.length - 1,
  };

  const activeIndex = statusIndex[status] ?? -1;

  return (
    <section className="rounded-2xl border border-[#eadfd5] bg-white p-5">
      <div className="mb-6 flex flex-col gap-1">
        <h3 className="font-semibold text-[#3d3029]">Order Progress</h3>
        <p className="text-xs text-[#8b7b70]">
          {status === "pending_confirmation"
            ? "Your order is waiting for confirmation."
            : status === "delivery_failed"
              ? "Delivery was unsuccessful. Another delivery attempt may be arranged."
              : status === "completed"
                ? "Your order has been completed. Thank you!"
                : "Follow your order as it moves through each stage."}
        </p>
      </div>

      <div className="flex w-full items-start">
        {steps.map((step, index) => {
          const isCompleted = index < activeIndex || status === "completed";
          const isActive = index === activeIndex && status !== "completed";

          return (
            <div key={step} className="flex min-w-0 flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                {index > 0 && (
                  <div
                    className={`h-[2px] flex-1 ${
                      index <= activeIndex ? "bg-[#a86f52]" : "bg-[#eadfd5]"
                    }`}
                  />
                )}

                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${
                    isCompleted
                      ? "border-[#a86f52] bg-[#a86f52] text-white"
                      : isActive
                        ? "border-[#a86f52] bg-[#a86f52] text-white ring-4 ring-[#f3e5d8]"
                        : "border-[#eadfd5] bg-white text-[#8b7b70]"
                  }`}
                >
                  {isCompleted ? (
                    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                      <path
                        d="m4 10 4 4 8-8"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    `0${index + 1}`
                  )}
                </div>

                {index < steps.length - 1 && (
                  <div
                    className={`h-[2px] flex-1 ${
                      index < activeIndex ? "bg-[#a86f52]" : "bg-[#eadfd5]"
                    }`}
                  />
                )}
              </div>

              <p
                className={`mt-3 max-w-[90px] text-center text-[10px] leading-tight sm:max-w-none sm:text-xs ${
                  isActive || isCompleted
                    ? "font-semibold text-[#3d3029]"
                    : "text-[#8b7b70]"
                }`}
              >
                {step}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
