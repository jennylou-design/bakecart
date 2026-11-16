"use client";
import OrderProgress from "@/components/store/order-progress";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ShoppingBag, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type AnyRow = Record<string, any>;

function formatCurrency(value: number) {
  return `₱${Number(value ?? 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatStatus(value: string) {
  return (value || "unknown").replaceAll("_", " ");
}

function formatDate(value: string) {
  return value
    ? new Date(value).toLocaleString("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Not specified";
}

const statusStyles: Record<string, string> = {
  pending_payment: "bg-amber-100 text-amber-800",
  pending_confirmation: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  preparing: "bg-purple-100 text-purple-800",
  ready_for_pickup: "bg-green-100 text-green-800",
  out_for_delivery: "bg-indigo-100 text-indigo-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [expandedOrders, setExpandedOrders] = useState<string[]>([]);
  const [actionInProgress, setActionInProgress] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();

      // Admin loads all orders, not just the current user's orders.
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (orderError) throw orderError;

      const orderRows = (orderData ?? []) as AnyRow[];

      if (orderRows.length === 0) {
        setOrders([]);
        return;
      }

      const orderIds = orderRows.map((order) => order.id);

      const [
        itemsResult,
        fulfillmentResult,
        paymentsResult,
      ] = await Promise.all([
        supabase.from("order_items").select("*").in("order_id", orderIds),
        supabase.from("order_fulfillments").select("*").in("order_id", orderIds),
        supabase.from("payments").select("*").in("order_id", orderIds),
      ]);

      if (itemsResult.error) throw itemsResult.error;
      if (fulfillmentResult.error) throw fulfillmentResult.error;
      if (paymentsResult.error) throw paymentsResult.error;

      const items = (itemsResult.data ?? []) as AnyRow[];
      const itemIds = items.map((item) => item.id);

      let optionRows: AnyRow[] = [];
      let detailRows: AnyRow[] = [];

      if (itemIds.length > 0) {
        const [optionsResult, detailsResult] = await Promise.all([
          supabase
            .from("order_item_options")
            .select("*")
            .in("order_item_id", itemIds),
          supabase
            .from("custom_cake_details")
            .select("*")
            .in("order_item_id", itemIds),
        ]);

        if (optionsResult.error) throw optionsResult.error;
        if (detailsResult.error) throw detailsResult.error;

        optionRows = (optionsResult.data ?? []) as AnyRow[];
        detailRows = (detailsResult.data ?? []) as AnyRow[];
      }

      const payments: AnyRow[] = await Promise.all(
        ((paymentsResult.data ?? []) as AnyRow[]).map(async (payment) => {
          let receiptUrl: string | null = null;

          if (payment.receipt_path) {
            const { data } = await supabase.storage
              .from("payment-receipts")
              .createSignedUrl(payment.receipt_path, 600);

            receiptUrl = data?.signedUrl ?? null;
          }

          return { ...payment, receipt_url: receiptUrl };
        })
      );

      const ordersWithDetails = await Promise.all(
        orderRows.map(async (order) => {
          const orderItems = await Promise.all(
            items
              .filter((item) => item.order_id === order.id)
              .map(async (item) => {
                const customDetails = detailRows.find(
                  (detail) => detail.order_item_id === item.id
                );

                let referenceImageUrl: string | null = null;

                if (customDetails?.reference_image_url) {
                  const { data } = await supabase.storage
                    .from("custom-cake-references")
                    .createSignedUrl(
                      customDetails.reference_image_url,
                      600
                    );

                  referenceImageUrl = data?.signedUrl ?? null;
                }

                return {
                  ...item,
                  options: optionRows.filter(
                    (option) => option.order_item_id === item.id
                  ),
                  customDetails: customDetails
                    ? {
                        ...customDetails,
                        reference_image_url: referenceImageUrl,
                      }
                    : null,
                };
              })
          );

          return {
            ...order,
            order_items: orderItems,
            order_fulfillments: (
              fulfillmentResult.data ?? []
            ).filter((fulfillment: AnyRow) => fulfillment.order_id === order.id),
            payments: payments.filter(
              (payment) => payment.order_id === order.id
            ),
          };
        })
      );

      setOrders(ordersWithDetails);
    } catch (err) {
      console.error("Admin orders loading error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load orders."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const handleVerifyPayment = async (paymentId: string) => {
    if (!window.confirm("Verify this customer's payment and confirm the order?")) return;

    setActionInProgress(paymentId);
    setError("");
    setActionMessage("");

    try {
      const supabase = createClient();
      const { error } = await (supabase as any).rpc(
        "admin_verify_payment",
        { p_payment_id: paymentId }
      );

      if (error) throw error;

      setActionMessage("Payment verified and order confirmed.");
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to verify payment.");
    } finally {
      setActionInProgress("");
    }
  };

  const handleRejectReceipt = async (paymentId: string) => {
    const reason = window.prompt(
      "Enter the reason for rejecting this payment receipt (at least 5 characters):"
    );

    if (reason === null) return;

    if (reason.trim().length < 5 || reason.trim().length > 500) {
      setError("Rejection reason must be between 5 and 500 characters.");
      return;
    }

    if (!window.confirm("Reject this receipt and automatically cancel its order?")) return;

    setActionInProgress(paymentId);
    setError("");
    setActionMessage("");

    try {
      const supabase = createClient();
      const { error } = await (supabase as any).rpc(
        "admin_reject_payment_receipt",
        {
          p_payment_id: paymentId,
          p_rejection_reason: reason.trim(),
        }
      );

      if (error) throw error;

      setActionMessage("Receipt rejected. The order was cancelled.");
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reject receipt.");
    } finally {
      setActionInProgress("");
    }
  };

  const handleOrderStatusUpdate = async (
    orderId: string,
    nextStatus: string
  ) => {
    const order = orders.find((item) => item.id === orderId);
    if (!order) return;

    const allowedTransitions: Record<string, string[]> = {
      pending_confirmation: ["confirmed"],
      confirmed: ["preparing"],
      preparing: [
        order.fulfillment_type === "pickup"
          ? "ready_for_pickup"
          : "ready_for_delivery",
      ],
      ready_for_pickup: ["completed"],
      ready_for_delivery: ["out_for_delivery"],
      out_for_delivery: ["completed", "delivery_failed"],
      delivery_failed: ["out_for_delivery"],
    };

    if (!allowedTransitions[order.order_status]?.includes(nextStatus)) {
      setError("That order status transition is not allowed.");
      return;
    }

    if (!window.confirm(`Change order status to "${formatStatus(nextStatus)}"?`)) {
      return;
    }

    setActionInProgress(orderId);
    setError("");
    setActionMessage("");

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("orders")
        .update({
          order_status: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (error) throw error;

      setActionMessage(`Order status updated to ${formatStatus(nextStatus)}.`);
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update order status.");
    } finally {
      setActionInProgress("");
    }
  };

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const filterOptions = [
    { value: "all", label: "All Orders" },
    { value: "pending", label: "Pending" },
    { value: "preparing", label: "Preparing" },
    { value: "completed", label: "Completed" },
    { value: "returns", label: "Returns / Cancellations" },
  ];

  const filteredOrders = orders.filter((order) => {
    const query = search.toLowerCase();
    const status = String(order.order_status ?? "").toLowerCase();

    const matchesSearch =
      String(order.order_number ?? "").toLowerCase().includes(query) ||
      status.includes(query) ||
      String(order.fulfillment_type ?? "").toLowerCase().includes(query);

    const hasRefund = Array.isArray(order.payments) &&
      order.payments.some((payment: AnyRow) => {
        const refundStatus = String(payment.refund_status ?? "").toLowerCase();
        return refundStatus !== "" && refundStatus !== "not_applicable";
      });

    let matchesFilter = true;

    if (activeFilter === "pending") {
      matchesFilter = ["pending_payment", "pending_confirmation"].includes(status);
    } else if (activeFilter === "preparing") {
      matchesFilter = [
        "confirmed",
        "preparing",
        "ready_for_pickup",
        "ready_for_delivery",
        "out_for_delivery",
        "delivery_failed",
      ].includes(status);
    } else if (activeFilter === "completed") {
      matchesFilter = status === "completed";
    } else if (activeFilter === "returns") {
      matchesFilter = status === "cancelled" || hasRefund;
    }

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold tracking-widest text-[#a86f52]">
            BAKECART ADMINISTRATION
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[#3d3029]">
            Order Management
          </h1>
          <p className="mt-2 text-sm text-[#8b7b70]">
            Review customer orders, custom cake requests, fulfillment details,
            and payment records.
          </p>
        </div>

        <button
          onClick={() => void loadOrders()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#eadfd5] bg-white px-5 py-3 text-sm font-semibold text-[#3d3029] hover:bg-[#fffaf5] disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh Orders
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#eadfd5] bg-white p-5">
          <p className="text-sm text-[#8b7b70]">Total Orders</p>
          <p className="mt-2 text-3xl font-bold text-[#3d3029]">
            {orders.length}
          </p>
        </div>
        <div className="rounded-2xl border border-[#eadfd5] bg-white p-5">
          <p className="text-sm text-[#8b7b70]">Pending Orders</p>
          <p className="mt-2 text-3xl font-bold text-amber-700">
            {orders.filter((order) =>
              ["pending_payment", "pending_confirmation"].includes(
                order.order_status
              )
            ).length}
          </p>
        </div>
        <div className="rounded-2xl border border-[#eadfd5] bg-white p-5">
          <p className="text-sm text-[#8b7b70]">Completed Orders</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">
            {orders.filter((order) => order.order_status === "completed").length}
          </p>
        </div>
                <div className="rounded-2xl border border-[#eadfd5] bg-white p-5">
          <p className="text-sm text-[#8b7b70]">Returns / Cancellations</p>
          <p className="mt-2 text-3xl font-bold text-[#a86f52]">
            {orders.filter((order) => {
              const status = String(order.order_status ?? "").toLowerCase();
              const hasRefund =
                Array.isArray(order.payments) &&
                order.payments.some((payment: AnyRow) => {
                  const refundStatus = String(payment.refund_status ?? "").toLowerCase();
                  return refundStatus !== "" && refundStatus !== "not_applicable";
                });

              return status === "cancelled" || hasRefund;
            }).length}
          </p>
        </div>
      </div>

      {actionMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {actionMessage}
        </div>
      )}

      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search by order number, status, or fulfillment..."
        className="w-full rounded-xl border border-[#eadfd5] bg-white px-4 py-3 text-sm outline-none focus:border-[#a86f52]"
      />

      <div className="flex flex-wrap gap-2">
        {filterOptions.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setActiveFilter(filter.value)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              activeFilter === filter.value
                ? "border-[#a86f52] bg-[#a86f52] text-white"
                : "border-border bg-white text-[#6b5b50] hover:bg-[#f8f5f1]"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-[#eadfd5] bg-white p-12 text-center text-[#8b7b70]">
          Loading orders...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-[#eadfd5] bg-white p-12 text-center">
          <ShoppingBag className="mx-auto text-[#a86f52]" size={36} />
          <h2 className="mt-4 text-xl font-semibold text-[#3d3029]">
            {orders.length === 0 ? "No orders found" : "No matching orders"}
          </h2>
          <p className="mt-2 text-sm text-[#8b7b70]">
            {orders.length === 0
              ? "Customer orders will appear here once they are placed."
              : "Try another search term."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredOrders.map((order) => {
            const fulfillment = order.order_fulfillments?.[0];
            const statusTransitions: Record<string, string[]> = {
              pending_confirmation: ["confirmed"],
              confirmed: ["preparing"],
              preparing: [
                order.fulfillment_type === "pickup"
                  ? "ready_for_pickup"
                  : "ready_for_delivery",
              ],
              ready_for_pickup: ["completed"],
              ready_for_delivery: ["out_for_delivery"],
              out_for_delivery: ["completed", "delivery_failed"],
              delivery_failed: ["out_for_delivery"],
            };
            const nextStatuses = statusTransitions[order.order_status] ?? [];
              const isExpanded = expandedOrders.includes(order.id);

            return (
              <article
                key={order.id}
                className="overflow-hidden rounded-2xl border border-[#eadfd5] bg-white shadow-sm"
              >
                <div className="flex flex-col justify-between gap-4 border-b border-[#eadfd5] bg-[#fffaf5] p-5 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-xs font-semibold tracking-wider text-[#8b7b70]">
                      ORDER NUMBER
                    </p>
                    <h2 className="mt-1 text-lg font-bold text-[#3d3029]">
                      {order.order_number}
                    </h2>
                    <p className="mt-1 text-xs text-[#8b7b70]">
                      {formatDate(order.created_at)}
                    </p>
                  <p className="mt-2 text-sm font-bold text-[#a86f52]">
                    Total: {formatCurrency(order.total_amount)}
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

                  {nextStatuses.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {nextStatuses.map((nextStatus) => (
                        <button
                          key={nextStatus}
                          type="button"
                          disabled={actionInProgress !== ""}
                          onClick={() =>
                            void handleOrderStatusUpdate(order.id, nextStatus)
                          }
                          className="rounded-xl bg-[#a86f52] px-4 py-2 text-xs font-semibold text-white hover:bg-[#8f5c43] disabled:opacity-50"
                        >
                          {actionInProgress === order.id
                            ? "Updating..."
                            : `Move to ${formatStatus(nextStatus)}`}
                        </button>
                      ))}
                    </div>
                  )}
                                    <button
                      type="button"
                      onClick={() =>
                        setExpandedOrders((current) =>
                          current.includes(order.id)
                            ? current.filter((id) => id !== order.id)
                            : [...current, order.id]
                        )
                      }
                      aria-expanded={isExpanded}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#e7cbb8] bg-[#fff4e9] px-4 py-2.5 text-sm font-semibold text-[#8f5c43] shadow-sm transition hover:border-[#c89575] hover:bg-[#f8e8d9] focus:outline-none focus:ring-2 focus:ring-[#c89575]/40"
                    >
                      {isExpanded ? "Hide Details" : "View Details"}
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
</div>

                {isExpanded && (
                  <div className="space-y-6 p-5">
                  <OrderProgress
                    status={order.order_status}
                    fulfillmentType={order.fulfillment_type}
                  />
                  <section>
                    <h3 className="mb-4 font-semibold text-[#3d3029]">
                      Ordered Products
                    </h3>

                    <div className="space-y-5">
                      {order.order_items?.map((item: AnyRow) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-[#eadfd5] p-4"
                        >
                          <div className="flex flex-wrap justify-between gap-3">
                            <div>
                              <p className="font-semibold text-[#3d3029]">
                                {item.product_name_snapshot}
                              </p>
                              {item.variant_name_snapshot && (
                                <p className="mt-1 text-sm text-[#8b7b70]">
                                  {item.variant_name_snapshot}
                                </p>
                              )}
                              <p className="mt-1 text-xs text-[#8b7b70]">
                                Quantity: {item.quantity}
                              </p>
                            </div>
                            <p className="font-semibold text-[#a86f52]">
                              {formatCurrency(item.line_total)}
                            </p>
                          </div>

                          {item.options?.length > 0 && (
                            <div className="mt-4 rounded-lg bg-[#fffaf5] p-3">
                              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#8b7b70]">
                                Custom Cake Selections
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {item.options.map((option: AnyRow) => (
                                  <span
                                    key={option.id}
                                    className="rounded-full bg-white px-3 py-1 text-xs text-[#6f5b50]"
                                  >
                                    {option.option_type_snapshot}: {option.option_name_snapshot}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {item.customDetails && (
                            <div className="mt-3 space-y-2 text-sm text-[#6f5b50]">
                              {item.customDetails.cake_message && (
                                <p>
                                  <strong>Cake Message:</strong>{" "}
                                  {item.customDetails.cake_message}
                                </p>
                              )}
                              {item.customDetails.special_instructions && (
                                <p>
                                  <strong>Special Instructions:</strong>{" "}
                                  {item.customDetails.special_instructions}
                                </p>
                              )}
                              {item.customDetails.admin_notes && (
                                <p>
                                  <strong>Admin Notes:</strong>{" "}
                                  {item.customDetails.admin_notes}
                                </p>
                              )}
                              {item.customDetails.reference_image_url && (
                                <a
                                  href={item.customDetails.reference_image_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-2 font-semibold text-[#a86f52] underline"
                                >
                                  View Reference Image <ExternalLink size={14} />
                                </a>
                              )}
                            </div>
                          )}
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

                  <section className="rounded-xl bg-[#fffaf5] p-4">
                    <h3 className="font-semibold text-[#3d3029]">
                      Fulfillment Arrangement
                    </h3>
                    <div className="mt-3 space-y-2 text-sm text-[#6f5b50]">
                      <p>
                        <strong>Method:</strong>{" "}
                        {formatStatus(order.fulfillment_type)}
                      </p>
                      {fulfillment ? (
                        <>
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
                              ].filter(Boolean).join(", ") || "Not specified"}
                            </p>
                          )}
                          {fulfillment.delivery_instructions && (
                            <p>
                              <strong>Instructions:</strong>{" "}
                              {fulfillment.delivery_instructions}
                            </p>
                          )}
                          <p>
                            <strong>Schedule:</strong>{" "}
                            {fulfillment.scheduled_date
                              ? `${fulfillment.scheduled_date} ${fulfillment.scheduled_start_time ?? ""} ${fulfillment.scheduled_end_time ? `â€“ ${fulfillment.scheduled_end_time}` : ""}`
                              : "To be confirmed with customer"}
                          </p>
                        </>
                      ) : (
                        <p>Fulfillment details are not available.</p>
                      )}
                    </div>
                  </section>

                  {order.customer_notes && (
                    <section>
                      <h3 className="font-semibold text-[#3d3029]">
                        Customer Notes
                      </h3>
                      <p className="mt-2 text-sm text-[#8b7b70]">
                        {order.customer_notes}
                      </p>
                    </section>
                  )}

                  <section className="border-t border-[#eadfd5] pt-5">
                    <h3 className="mb-4 font-semibold text-[#3d3029]">
                      Payment Records
                    </h3>

                    {order.payments?.length ? (
                      <div className="space-y-4">
                        {order.payments.map((payment: AnyRow) => (
                          <div
                            key={payment.id}
                            className="rounded-xl border border-[#eadfd5] p-4 text-sm"
                          >
                            <p>
                              <strong>Method:</strong>{" "}
                              {formatStatus(payment.payment_method ?? "Not specified")}
                            </p>
                            <p className="mt-2">
                              <strong>Amount:</strong>{" "}
                              {formatCurrency(payment.amount)}
                            </p>
                            <p className="mt-2">
                              <strong>Reference:</strong>{" "}
                              {payment.merchant_reference}
                            </p>
                            <p className="mt-2">
                              <strong>Payment Status:</strong>{" "}
                              {formatStatus(payment.payment_status)}
                            </p>
                            <p className="mt-2">
                              <strong>Receipt Status:</strong>{" "}
                              {formatStatus(payment.receipt_status ?? "not submitted")}
                            </p>
                            {payment.customer_reference && (
                              <p className="mt-2">
                                <strong>Customer Reference:</strong>{" "}
                                {payment.customer_reference}
                              </p>
                            )}
                            {payment.rejection_reason && (
                              <p className="mt-2 text-red-700">
                                <strong>Rejection Reason:</strong>{" "}
                                {payment.rejection_reason}
                              </p>
                            )}
                            {payment.receipt_url && (
                              <a
                                href={payment.receipt_url}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-3 inline-flex items-center gap-2 font-semibold text-[#a86f52] underline"
                              >
                                View Payment Receipt <ExternalLink size={14} />
                              </a>
                            )}

                            {["gcash", "bank_transfer"].includes(payment.payment_method) &&
                              payment.payment_status === "pending" &&
                              payment.receipt_status === "submitted" &&
                              payment.customer_reference &&
                              payment.receipt_path && (
                                <div className="mt-4 flex flex-wrap gap-2 border-t border-[#eadfd5] pt-4">
                                  <button
                                    type="button"
                                    disabled={actionInProgress !== ""}
                                    onClick={() => void handleVerifyPayment(payment.id)}
                                    className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                                  >
                                    {actionInProgress === payment.id ? "Processing..." : "Verify Payment"}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={actionInProgress !== ""}
                                    onClick={() => void handleRejectReceipt(payment.id)}
                                    className="rounded-xl bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-50"
                                  >
                                    Reject Receipt
                                  </button>
                                </div>
                              )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-[#8b7b70]">
                        No payment records found.
                      </p>
                    )}
                  </section>
                </div>
                  )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
