
"use client";
import OrderProgress from "@/components/store/order-progress";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type OrderItem = {
  id: string;
  product_name_snapshot: string;
  variant_name_snapshot: string | null;
  unit_price_snapshot: number;
  quantity: number;
  line_total: number;
};

type Fulfillment = {
  recipient_name: string;
  recipient_phone: string;
  address_line: string | null;
  barangay: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  delivery_instructions: string | null;
  scheduled_date: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
};

type Payment = {
  id: string;
  order_id: string;
  payment_method: string | null;
  merchant_reference: string;
  payment_status: string;
  amount: number;
  customer_reference: string | null;
  receipt_path: string | null;
  submitted_at: string | null;
  receipt_status: string;
  rejection_reason: string | null;
  receipt_url: string | null;
  refund_status: string;
};

type Order = {
  id: string;
  order_number: string;
  order_status: string;
  fulfillment_type: "pickup" | "delivery";
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  customer_notes: string | null;
  created_at: string;
  order_items: OrderItem[];
  order_fulfillments: Fulfillment | Fulfillment[] | null;
  payments: Payment[];
};

const statusStyles: Record<string, string> = {
  pending_payment: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  preparing: "bg-purple-100 text-purple-800",
  ready_for_pickup: "bg-green-100 text-green-800",
  out_for_delivery: "bg-indigo-100 text-indigo-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
};

function formatCurrency(amount: number) {
  return `â‚±${Number(amount).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

function formatPaymentMethod(method: string | null) {
  const methods: Record<string, string> = {
    cash_on_pickup: "Cash on Pickup",
    cash_on_delivery: "Cash on Delivery",
    gcash: "GCash",
    bank_transfer: "Bank Transfer",
  };

  return method ? methods[method] ?? formatStatus(method) : "Not specified";
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatCountdown(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours}h ${minutes}m ${seconds}s`;
}

function formatTime(time: string | null) {
  if (!time) return "To be confirmed";
  const [hours, minutes] = time.split(":");
  const date = new Date();

  date.setHours(Number(hours), Number(minutes), 0, 0);

  return date.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getFulfillment(
  fulfillment: Order["order_fulfillments"]
): Fulfillment | null {
  if (Array.isArray(fulfillment)) {
    return fulfillment[0] ?? null;
  }

  return fulfillment;
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeFilter, setActiveFilter] = useState<
    "all" | "pending" | "preparing" | "completed" | "returns"
  >("all");
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [currentTime, setCurrentTime] = useState<number | null>(null);

  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(
    null
  );

  const [cancellationErrors, setCancellationErrors] = useState<
    Record<string, string>
  >({});

  const [uploadingPaymentId, setUploadingPaymentId] = useState<string | null>(
    null
  );

  const [customerReferences, setCustomerReferences] = useState<
    Record<string, string>
  >({});

  const [receiptFiles, setReceiptFiles] = useState<
    Record<string, File | null>
  >({});

  const [receiptErrors, setReceiptErrors] = useState<
    Record<string, string>
  >({});

  async function loadOrders() {
    setLoading(true);
    setPageError("");

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setPageError("Please sign in to view your orders.");
        setOrders([]);
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (*),
          order_fulfillments (*)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      const loadedOrders = (data ?? []) as unknown as Order[];

      if (loadedOrders.length === 0) {
        setOrders([]);
        return;
      }

      const orderIds = loadedOrders.map((order) => order.id);

      const { data: paymentData, error: paymentError } = await supabase
        .from("payments")
        .select(`
          id,
          order_id,
          payment_method,
          merchant_reference,
          payment_status,
          amount,
          customer_reference,
          receipt_path,
          submitted_at,
          receipt_status,
          rejection_reason,
          refund_status
        `)
        .in("order_id", orderIds);

      if (paymentError) {
        throw new Error(paymentError.message);
      }

      const paymentsWithReceiptUrls = await Promise.all(
        (paymentData ?? []).map(async (payment) => {
          if (!payment.receipt_path) {
            return {
              ...payment,
              receipt_url: null,
            };
          }

          const { data: signedData, error: signedError } =
            await supabase.storage
              .from("payment-receipts")
              .createSignedUrl(payment.receipt_path, 600);

          if (signedError) {
            console.error("Receipt URL error:", signedError);

            return {
              ...payment,
              receipt_url: null,
            };
          }

          return {
            ...payment,
            receipt_url: signedData.signedUrl,
          };
        })
      );

      const ordersWithPayments = loadedOrders.map((order) => ({
        ...order,
        payments: paymentsWithReceiptUrls.filter(
          (payment) => payment.order_id === order.id
        ),
      }));

      setOrders(ordersWithPayments as unknown as Order[]);
    } catch (error) {
      console.error("My Orders loading error:", error);

      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to load your orders."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live countdown clock
  useEffect(() => {
    setCurrentTime(Date.now());

    const interval = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    const isPendingOrder = (order: Order) =>
    ["pending_payment", "pending_confirmation"].includes(order.order_status);

  const isPreparingOrder = (order: Order) =>
    [
      "confirmed",
      "preparing",
      "ready_for_pickup",
      "ready_for_delivery",
      "out_for_delivery",
      "delivery_failed",
    ].includes(order.order_status);

  const isReturnsOrder = (order: Order) =>
    order.order_status === "cancelled" ||
    order.payments.some(
      (payment) =>
        payment.refund_status &&
        payment.refund_status !== "not_applicable"
    );

  const filteredOrders = orders.filter((order) => {
    switch (activeFilter) {
      case "pending":
        return isPendingOrder(order);
      case "preparing":
        return isPreparingOrder(order);
      case "completed":
        return order.order_status === "completed";
      case "returns":
        return isReturnsOrder(order);
      default:
        return true;
    }
  });

  const filterOptions = [
    { key: "all", label: "All Orders", count: orders.length },
    {
      key: "pending",
      label: "Pending",
      count: orders.filter(isPendingOrder).length,
    },
    {
      key: "preparing",
      label: "Preparing",
      count: orders.filter(isPreparingOrder).length,
    },
    {
      key: "completed",
      label: "Completed",
      count: orders.filter((order) => order.order_status === "completed").length,
    },
    {
      key: "returns",
      label: "Returns / Cancellations",
      count: orders.filter(isReturnsOrder).length,
    },
  ] as const;
  return () => window.clearInterval(interval);
  }, []);

  // Customer order cancellation
  async function handleCancelOrder(order: Order) {
    const confirmed = window.confirm(
      `Are you sure you want to cancel order ${order.order_number}?\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setCancellingOrderId(order.id);

    setCancellationErrors((previous) => ({
      ...previous,
      [order.id]: "",
    }));

    try {
      const supabase = createClient();

      const { data, error } = await supabase.rpc(
        "cancel_customer_order",
        {
          p_order_id: order.id,
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.success) {
        throw new Error("Unable to cancel this order.");
      }

      await loadOrders();
    } catch (error) {
      console.error("Order cancellation error:", error);

      setCancellationErrors((previous) => ({
        ...previous,
        [order.id]:
          error instanceof Error
            ? error.message
            : "Unable to cancel your order.",
      }));
    } finally {
      setCancellingOrderId(null);
    }
  }

  // Customer payment receipt submission
  async function handleReceiptSubmit(
    event: FormEvent<HTMLFormElement>,
    order: Order,
    payment: Payment
  ) {
    event.preventDefault();

    const reference = (customerReferences[payment.id] ?? "").trim();
    const receiptFile = receiptFiles[payment.id];

    setReceiptErrors((previous) => ({
      ...previous,
      [payment.id]: "",
    }));

    if (reference.length < 3 || reference.length > 100) {
      setReceiptErrors((previous) => ({
        ...previous,
        [payment.id]:
          "Transaction reference must be between 3 and 100 characters.",
      }));
      return;
    }

    if (!receiptFile) {
      setReceiptErrors((previous) => ({
        ...previous,
        [payment.id]: "Please select your payment receipt image.",
      }));
      return;
    }

    if (
      !["image/jpeg", "image/png", "image/webp"].includes(receiptFile.type)
    ) {
      setReceiptErrors((previous) => ({
        ...previous,
        [payment.id]: "Only JPG, PNG, and WebP images are accepted.",
      }));
      return;
    }

    if (receiptFile.size > 5 * 1024 * 1024) {
      setReceiptErrors((previous) => ({
        ...previous,
        [payment.id]: "Your receipt image must be 5MB or smaller.",
      }));
      return;
    }

    setUploadingPaymentId(payment.id);

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(
          "Please sign in again before submitting your receipt."
        );
      }

      const extension =
        receiptFile.type === "image/jpeg"
          ? "jpg"
          : receiptFile.type === "image/png"
            ? "png"
            : "webp";

      const path = `${user.id}/${order.id}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("payment-receipts")
        .upload(path, receiptFile, {
          contentType: receiptFile.type,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { error: submitError } = await supabase.rpc(
        "submit_payment_receipt",
        {
          p_order_id: order.id,
          p_customer_reference: reference,
          p_receipt_path: path,
        }
      );

      if (submitError) {
        throw new Error(submitError.message);
      }

      setCustomerReferences((previous) => ({
        ...previous,
        [payment.id]: "",
      }));

      setReceiptFiles((previous) => ({
        ...previous,
        [payment.id]: null,
      }));

      const fileInput = document.getElementById(
        `receipt-${payment.id}`
      ) as HTMLInputElement | null;

      if (fileInput) {
        fileInput.value = "";
      }

      await loadOrders();
    } catch (error) {
      console.error("Receipt submission error:", error);

      setReceiptErrors((previous) => ({
        ...previous,
        [payment.id]:
          error instanceof Error
            ? error.message
            : "Unable to submit your receipt.",
      }));
    } finally {
      setUploadingPaymentId(null);
    }
  }

  const isPendingOrder = (order: Order) =>
    ["pending_payment", "pending_confirmation"].includes(order.order_status);

  const isPreparingOrder = (order: Order) =>
    [
      "confirmed",
      "preparing",
      "ready_for_pickup",
      "ready_for_delivery",
      "out_for_delivery",
      "delivery_failed",
    ].includes(order.order_status);

  const isReturnsOrder = (order: Order) =>
    order.order_status === "cancelled" ||
    order.payments.some(
      (payment) =>
        payment.refund_status &&
        payment.refund_status !== "not_applicable"
    );

  const filteredOrders = orders.filter((order) => {
    switch (activeFilter) {
      case "pending":
        return isPendingOrder(order);
      case "preparing":
        return isPreparingOrder(order);
      case "completed":
        return order.order_status === "completed";
      case "returns":
        return isReturnsOrder(order);
      default:
        return true;
    }
  });

  const filterOptions = [
    { key: "all", label: "All Orders", count: orders.length },
    {
      key: "pending",
      label: "Pending",
      count: orders.filter(isPendingOrder).length,
    },
    {
      key: "preparing",
      label: "Preparing",
      count: orders.filter(isPreparingOrder).length,
    },
    {
      key: "completed",
      label: "Completed",
      count: orders.filter((order) => order.order_status === "completed").length,
    },
    {
      key: "returns",
      label: "Returns / Cancellations",
      count: orders.filter(isReturnsOrder).length,
    },
  ] as const;
  return (
    <div className="min-h-screen bg-[#fffaf5] px-5 py-12 text-[#3d3029] sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold tracking-[0.2em] text-[#a86f52]">
              YOUR BAKECART ACCOUNT
            </p>

            <h1 className="mt-3 font-serif text-4xl font-semibold">
              My Orders
            </h1>

            <p className="mt-2 text-sm text-[#8b7b70]">
              Track your purchases and manage your payment receipts.
            </p>
          </div>

          <button
            onClick={loadOrders}
            disabled={loading}
            className="rounded-xl border border-[#eadfd5] bg-white px-5 py-3 text-sm font-semibold transition hover:bg-[#f3e5d8] disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh Orders"}
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-[#eadfd5] bg-white p-12 text-center">
            <p className="text-[#8b7b70]">Loading your orders...</p>
          </div>
        ) : pageError ? (
          <div className="rounded-2xl border border-[#eadfd5] bg-white p-8 text-center">
            <p className="text-red-700">{pageError}</p>

            <Link
              href="/login"
              className="mt-5 inline-block rounded-xl bg-[#7a5443] px-6 py-3 text-sm font-semibold text-white"
            >
              Sign In
            </Link>
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-[#eadfd5] bg-white px-6 py-16 text-center">
            <h2 className="font-serif text-2xl font-semibold">
              No orders yet
            </h2>

            <p className="mt-2 text-sm text-[#8b7b70]">
              Your bakery orders will appear here once you place an order.
            </p>

            <Link
              href="/products"
              className="mt-6 inline-block rounded-xl bg-[#7a5443] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#654333]"
            >
              Explore Our Products
            </Link>
          </div>
        ) : (
          <div className="space-y-7">
            {/* Order Status Filters */}
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setActiveFilter(filter.key)}
                  aria-pressed={activeFilter === filter.key}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    activeFilter === filter.key
                      ? "border-[#a86f52] bg-[#a86f52] text-white"
                      : "border-[#eadfd5] bg-white text-[#6b5b50] hover:bg-[#f8f5f1]"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {filteredOrders.length === 0 ? (
              <div className="rounded-2xl border border-[#eadfd5] bg-white px-6 py-12 text-center">
                <h2 className="font-serif text-xl font-semibold">
                  No orders in this category
                </h2>
                <p className="mt-2 text-sm text-[#8b7b70]">
                  Orders matching this status will appear here.
                </p>
              </div>
            ) : null}
            {filteredOrders.map((order) => {
              const fulfillment = getFulfillment(
                order.order_fulfillments
              );

              const deadline =
                new Date(order.created_at).getTime() +
                5 * 60 * 60 * 1000;

              const remaining =
                currentTime === null
                  ? 0
                  : Math.max(0, deadline - currentTime);

              const isEligibleStatus = [
                "pending_payment",
                "confirmed",
              ].includes(order.order_status);

              const canCancel =
                isEligibleStatus &&
                currentTime !== null &&
                remaining > 0;

              const hasPaidPayment = order.payments.some(
                (payment) => payment.payment_status === "paid"
              );

              const isPendingOrder = (order: Order) =>
    ["pending_payment", "pending_confirmation"].includes(order.order_status);

  const isPreparingOrder = (order: Order) =>
    [
      "confirmed",
      "preparing",
      "ready_for_pickup",
      "ready_for_delivery",
      "out_for_delivery",
      "delivery_failed",
    ].includes(order.order_status);

  const isReturnsOrder = (order: Order) =>
    order.order_status === "cancelled" ||
    order.payments.some(
      (payment) =>
        payment.refund_status &&
        payment.refund_status !== "not_applicable"
    );

  const filteredOrders = orders.filter((order) => {
    switch (activeFilter) {
      case "pending":
        return isPendingOrder(order);
      case "preparing":
        return isPreparingOrder(order);
      case "completed":
        return order.order_status === "completed";
      case "returns":
        return isReturnsOrder(order);
      default:
        return true;
    }
  });

  const filterOptions = [
    { key: "all", label: "All Orders", count: orders.length },
    {
      key: "pending",
      label: "Pending",
      count: orders.filter(isPendingOrder).length,
    },
    {
      key: "preparing",
      label: "Preparing",
      count: orders.filter(isPreparingOrder).length,
    },
    {
      key: "completed",
      label: "Completed",
      count: orders.filter((order) => order.order_status === "completed").length,
    },
    {
      key: "returns",
      label: "Returns / Cancellations",
      count: orders.filter(isReturnsOrder).length,
    },
  ] as const;
  return (
                <article
                  key={order.id}
                  className="overflow-hidden rounded-2xl border border-[#eadfd5] bg-white shadow-sm"
                >
                  {/* Order Header */}
                  <div className="flex flex-col justify-between gap-4 border-b border-[#eadfd5] bg-[#fffaf5] p-6 sm:flex-row sm:items-center">
                    <div>
                      <p className="text-xs font-semibold tracking-wider text-[#8b7b70]">
                        ORDER NUMBER
                      </p>

                      <h2 className="mt-1 text-lg font-bold">
                        {order.order_number}
                      </h2>

                      <p className="mt-1 text-xs text-[#8b7b70]">
                        Placed on {formatDate(order.created_at)}
                      </p>
                    </div>

                    <span
                      className={`w-fit rounded-full px-4 py-2 text-xs font-bold capitalize ${
                        statusStyles[order.order_status] ??
                        "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {formatStatus(order.order_status)}
                    </span>
                  </div>

                  <div className="px-6 pt-5">
                    <OrderProgress
                      status={order.order_status}
                      fulfillmentType={order.fulfillment_type}
                    />
                  </div>

                  {/* Cancellation Section */}
                  <div className="border-b border-[#eadfd5] px-6 py-5">
                    {canCancel ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                          <div>
                            <p className="text-sm font-bold text-amber-900">
                              Cancellation available
                            </p>

                            <p className="mt-1 text-xs text-amber-800">
                              You can cancel this order within five hours
                              after placing it.
                            </p>

                            <p className="mt-2 text-sm font-bold tabular-nums text-amber-900">
                              Time remaining:{" "}
                              {formatCountdown(remaining)}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCancelOrder(order)}
                            disabled={cancellingOrderId === order.id}
                            className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {cancellingOrderId === order.id
                              ? "Cancelling..."
                              : "Cancel Order"}
                          </button>
                        </div>

                        {hasPaidPayment && (
                          <p className="mt-3 text-xs text-amber-800">
                            This order has already been paid. Cancellation
                            will require administrator refund review.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-[#eadfd5] bg-[#fffaf5] p-4">
                        <p className="text-sm font-semibold capitalize text-[#6f5b50]">
                          {order.order_status === "cancelled"
                            ? "This order has been cancelled."
                            : isEligibleStatus
                              ? "The five-hour cancellation period has expired."
                              : "This order is no longer eligible for cancellation."}
                        </p>
                      </div>
                    )}

                    {cancellationErrors[order.id] && (
                      <p className="mt-3 text-sm text-red-600">
                        {cancellationErrors[order.id]}
                      </p>
                    )}

                    {order.order_status === "cancelled" &&
                      order.payments.some(
                        (payment) =>
                          payment.payment_status === "paid" &&
                          payment.refund_status !== "not_applicable"
                      ) && (
                        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
                          <p className="font-semibold text-blue-900">
                            Refund Information
                          </p>

                          {order.payments
                            .filter(
                              (payment) =>
                                payment.payment_status === "paid"
                            )
                            .map((payment) => (
                              <div
                                key={payment.id}
                                className="mt-2 text-sm text-blue-800"
                              >
                                <p>
                                  Refund Status:{" "}
                                  <strong>
                                    {formatStatus(payment.refund_status)}
                                  </strong>
                                </p>

                                {payment.refund_status ===
                                  "pending_review" && (
                                  <p className="mt-1">
                                    Your refund request is awaiting
                                    administrator review. The payment has
                                    not yet been refunded.
                                  </p>
                                )}

                                {payment.refund_status === "processing" && (
                                  <p className="mt-1">
                                    Your refund is currently being processed.
                                  </p>
                                )}

                                {payment.refund_status === "refunded" && (
                                  <p className="mt-1">
                                    Your refund has been marked as completed
                                    by the administrator.
                                  </p>
                                )}

                                {payment.refund_status === "rejected" && (
                                  <p className="mt-1">
                                    Your refund request was not approved.
                                    Please contact the administrator for
                                    more information.
                                  </p>
                                )}
                              </div>
                            ))}
                        </div>
                      )}
                  </div>

                  <div className="space-y-6 p-6">
                    {/* Order Items */}
                    <section>
                      <h3 className="mb-4 font-semibold">Order Items</h3>

                      <div className="space-y-4">
                        {order.order_items?.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between gap-4 text-sm"
                          >
                            <div>
                              <p className="font-medium">
                                {item.product_name_snapshot}
                              </p>

                              {item.variant_name_snapshot && (
                                <p className="mt-1 text-xs text-[#8b7b70]">
                                  {item.variant_name_snapshot}
                                </p>
                              )}

                              <p className="mt-1 text-xs text-[#8b7b70]">
                                Quantity: {item.quantity}
                              </p>
                            </div>

                            <p className="font-semibold">
                              {formatCurrency(item.line_total)}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-5 space-y-2 border-t border-[#eadfd5] pt-4 text-sm">
                        <div className="flex justify-between">
                          <span className="text-[#8b7b70]">Subtotal</span>
                          <span>{formatCurrency(order.subtotal)}</span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-[#8b7b70]">Delivery Fee</span>
                          <span>{formatCurrency(order.delivery_fee)}</span>
                        </div>

                        <div className="flex justify-between border-t border-[#eadfd5] pt-3 text-base font-bold">
                          <span>Total</span>
                          <span className="text-[#a86f52]">
                            {formatCurrency(order.total_amount)}
                          </span>
                        </div>
                      </div>
                    </section>

                    {/* Fulfillment Details */}
                    {fulfillment && (
                      <section className="rounded-xl bg-[#fffaf5] p-5">
                        <h3 className="font-semibold">
                          Fulfillment Details
                        </h3>

                        <div className="mt-3 space-y-2 text-sm text-[#6f5b50]">
                          <p>
                            <strong>Type:</strong>{" "}
                            {formatStatus(order.fulfillment_type)}
                          </p>

                          <p>
                            <strong>Recipient:</strong>{" "}
                            {fulfillment.recipient_name}
                          </p>

                          <p>
                            <strong>Phone:</strong>{" "}
                            {fulfillment.recipient_phone}
                          </p>

                          {order.fulfillment_type === "delivery" && (
                            <p>
                              <strong>Address:</strong>{" "}
                              {[
                                fulfillment.address_line,
                                fulfillment.barangay,
                                fulfillment.city,
                                fulfillment.province,
                                fulfillment.postal_code,
                              ]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                          )}

                          <p>
                            <strong>Scheduled Date:</strong>{" "}
                            {formatDate(fulfillment.scheduled_date)}
                          </p>

                          <p>
                            <strong>Scheduled Time:</strong>{" "}
                            {formatTime(fulfillment.scheduled_start_time)} Ã¢â‚¬â€œ{" "}
                            {formatTime(fulfillment.scheduled_end_time)}
                          </p>

                          {fulfillment.delivery_instructions && (
                            <p>
                              <strong>Instructions:</strong>{" "}
                              {fulfillment.delivery_instructions}
                            </p>
                          )}
                        </div>
                      </section>
                    )}

                    {/* Customer Notes */}
                    {order.customer_notes && (
                      <section>
                        <h3 className="font-semibold">Order Notes</h3>

                        <p className="mt-2 text-sm text-[#8b7b70]">
                          {order.customer_notes}
                        </p>
                      </section>
                    )}

                    {/* Payment Information */}
                    <section className="border-t border-[#eadfd5] pt-6">
                      <h3 className="mb-4 font-semibold">
                        Payment Information
                      </h3>

                      {order.payments.length === 0 ? (
                        <p className="text-sm text-[#8b7b70]">
                          No payment information available.
                        </p>
                      ) : (
                        <div className="space-y-6">
                          {order.payments.map((payment) => {
                            const isOnlinePayment = [
                              "gcash",
                              "bank_transfer",
                            ].includes(payment.payment_method ?? "");

                            const canSubmitReceipt =
                              isOnlinePayment &&
                              payment.payment_status === "pending" &&
                              order.order_status === "pending_payment" &&
                              payment.receipt_status !== "submitted";

                            const isPendingOrder = (order: Order) =>
    ["pending_payment", "pending_confirmation"].includes(order.order_status);

  const isPreparingOrder = (order: Order) =>
    [
      "confirmed",
      "preparing",
      "ready_for_pickup",
      "ready_for_delivery",
      "out_for_delivery",
      "delivery_failed",
    ].includes(order.order_status);

  const isReturnsOrder = (order: Order) =>
    order.order_status === "cancelled" ||
    order.payments.some(
      (payment) =>
        payment.refund_status &&
        payment.refund_status !== "not_applicable"
    );

  const filteredOrders = orders.filter((order) => {
    switch (activeFilter) {
      case "pending":
        return isPendingOrder(order);
      case "preparing":
        return isPreparingOrder(order);
      case "completed":
        return order.order_status === "completed";
      case "returns":
        return isReturnsOrder(order);
      default:
        return true;
    }
  });

  const filterOptions = [
    { key: "all", label: "All Orders", count: orders.length },
    {
      key: "pending",
      label: "Pending",
      count: orders.filter(isPendingOrder).length,
    },
    {
      key: "preparing",
      label: "Preparing",
      count: orders.filter(isPreparingOrder).length,
    },
    {
      key: "completed",
      label: "Completed",
      count: orders.filter((order) => order.order_status === "completed").length,
    },
    {
      key: "returns",
      label: "Returns / Cancellations",
      count: orders.filter(isReturnsOrder).length,
    },
  ] as const;
  return (
                              <div
                                key={payment.id}
                                className="rounded-xl border border-[#eadfd5] p-5"
                              >
                                <div className="flex flex-wrap justify-between gap-3">
                                  <div>
                                    <p className="text-xs text-[#8b7b70]">
                                      PAYMENT METHOD
                                    </p>

                                    <p className="mt-1 font-semibold">
                                      {formatPaymentMethod(
                                        payment.payment_method
                                      )}
                                    </p>
                                  </div>

                                  <span
                                    className={`h-fit rounded-full px-3 py-1 text-xs font-bold capitalize ${
                                      payment.payment_status === "paid"
                                        ? "bg-green-100 text-green-800"
                                        : payment.payment_status === "cancelled"
                                          ? "bg-red-100 text-red-800"
                                          : "bg-amber-100 text-amber-800"
                                    }`}
                                  >
                                    {formatStatus(payment.payment_status)}
                                  </span>
                                </div>

                                <div className="mt-4 space-y-2 text-sm">
                                  <p>
                                    <span className="text-[#8b7b70]">
                                      Amount:
                                    </span>{" "}
                                    <strong>
                                      {formatCurrency(payment.amount)}
                                    </strong>
                                  </p>

                                  <p>
                                    <span className="text-[#8b7b70]">
                                      Payment Reference:
                                    </span>{" "}
                                    {payment.merchant_reference}
                                  </p>

                                  {payment.customer_reference && (
                                    <p>
                                      <span className="text-[#8b7b70]">
                                        Your Transaction Reference:
                                      </span>{" "}
                                      {payment.customer_reference}
                                    </p>
                                  )}
                                </div>

                                {payment.receipt_status === "submitted" && (
                                  <div className="mt-5 rounded-xl bg-amber-50 p-4">
                                    <p className="text-sm font-semibold text-amber-800">
                                      Receipt submitted Ã¢â‚¬â€ awaiting verification
                                    </p>

                                    {payment.receipt_url && (
                                      <a
                                        href={payment.receipt_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-3 inline-block text-sm font-semibold text-[#a86f52] underline"
                                      >
                                        View Submitted Receipt
                                      </a>
                                    )}
                                  </div>
                                )}

                                {payment.receipt_status === "rejected" && (
                                  <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
                                    <p className="font-semibold text-red-800">
                                      Receipt Rejected
                                    </p>

                                    <p className="mt-2 text-sm text-red-700">
                                      {payment.rejection_reason ||
                                        "Please submit a corrected receipt."}
                                    </p>

                                    {payment.receipt_url && (
                                      <a
                                        href={payment.receipt_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-3 inline-block text-sm font-semibold text-red-800 underline"
                                      >
                                        View Previous Receipt
                                      </a>
                                    )}
                                  </div>
                                )}

                                {canSubmitReceipt && (
                                  <form
                                    onSubmit={(event) =>
                                      handleReceiptSubmit(
                                        event,
                                        order,
                                        payment
                                      )
                                    }
                                    className="mt-5 space-y-4 border-t border-[#eadfd5] pt-5"
                                  >
                                    <div>
                                      <h4 className="font-semibold">
                                        {payment.receipt_status === "rejected"
                                          ? "Submit a Corrected Receipt"
                                          : "Submit Payment Receipt"}
                                      </h4>

                                      <p className="mt-1 text-xs text-[#8b7b70]">
                                        Upload a clear screenshot or photo of
                                        your payment confirmation.
                                      </p>
                                    </div>

                                    <div>
                                      <label
                                        htmlFor={`reference-${payment.id}`}
                                        className="mb-2 block text-sm font-medium"
                                      >
                                        Transaction Reference Number
                                      </label>

                                      <input
                                        id={`reference-${payment.id}`}
                                        type="text"
                                        required
                                        minLength={3}
                                        maxLength={100}
                                        value={
                                          customerReferences[payment.id] ?? ""
                                        }
                                        onChange={(event) =>
                                          setCustomerReferences((previous) => ({
                                            ...previous,
                                            [payment.id]: event.target.value,
                                          }))
                                        }
                                        placeholder="Enter your GCash or bank reference"
                                        className="w-full rounded-xl border border-[#eadfd5] px-4 py-3 text-sm outline-none focus:border-[#a86f52]"
                                      />
                                    </div>

                                    <div>
                                      <label
                                        htmlFor={`receipt-${payment.id}`}
                                        className="mb-2 block text-sm font-medium"
                                      >
                                        Payment Receipt Image
                                      </label>

                                      <input
                                        id={`receipt-${payment.id}`}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        required
                                        onChange={(event) =>
                                          setReceiptFiles((previous) => ({
                                            ...previous,
                                            [payment.id]:
                                              event.target.files?.[0] ?? null,
                                          }))
                                        }
                                        className="w-full rounded-xl border border-[#eadfd5] bg-white p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#f3e5d8] file:px-3 file:py-2 file:text-sm file:font-semibold"
                                      />

                                      <p className="mt-2 text-xs text-[#8b7b70]">
                                        JPG, PNG, or WebP. Maximum file size:
                                        5MB.
                                      </p>
                                    </div>

                                    {receiptErrors[payment.id] && (
                                      <p className="text-sm text-red-600">
                                        {receiptErrors[payment.id]}
                                      </p>
                                    )}

                                    <button
                                      type="submit"
                                      disabled={
                                        uploadingPaymentId === payment.id
                                      }
                                      className="w-full rounded-xl bg-[#7a5443] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#654333] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                                    >
                                      {uploadingPaymentId === payment.id
                                        ? "Submitting Receipt..."
                                        : payment.receipt_status === "rejected"
                                          ? "Resubmit Corrected Receipt"
                                          : "Submit Payment Receipt"}
                                    </button>
                                  </form>
                                )}

                                {!isOnlinePayment && (
                                  <p className="mt-4 text-xs text-[#8b7b70]">
                                    Payment will be collected according to
                                    your selected cash payment method.
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
