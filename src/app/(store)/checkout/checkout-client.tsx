"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ShoppingBag,
  ShieldCheck,
  Truck,
  MapPin,
  User,
  Phone,
  Minus,
  Plus,
  Loader2,
  Trash2,
} from "lucide-react";
import { useCartStore } from "@/lib/store/cart";
import { createClient } from "@/lib/supabase/client";
type CustomerProfile = {
  full_name: string | null;
  phone: string | null;
};
type CustomerAddress = {
  id: string;
  recipient_name: string;
  phone: string;
  address_line: string;
  barangay: string;
  city: string;
  province: string;
  postal_code: string | null;
  delivery_instructions: string | null;
  is_default: boolean;
};
type PaymentMethod =
  | "cash_on_pickup"
  | "cash_on_delivery"
  | "gcash"
  | "bank_transfer";
type CreatedOrder = {
  success: boolean;
  order_id: string;
  order_number: string;
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  order_status: string;
  payment_id: string;
  payment_reference: string;
  payment_method: PaymentMethod;
  payment_status: string;
};
type CheckoutClientProps = {
  profile: CustomerProfile;
  addresses: CustomerAddress[];
};
const emptyAddressForm = {
  recipient_name: "",
  phone: "",
  address_line: "",
  barangay: "",
  city: "",
  province: "",
  postal_code: "",
  delivery_instructions: "",
};
export default function CheckoutClient({
  profile,
  addresses,
}: CheckoutClientProps) {
  const items = useCartStore((state) => state.items);
  const getSubtotal = useCartStore((state) => state.getSubtotal);
  const clearCart = useCartStore((state) => state.clearCart);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const totalItems = useCartStore((state) => state.getTotalItems());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);
  //* Payment receipt submission*
  const [customerReference, setCustomerReference] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptSubmitting, setReceiptSubmitting] = useState(false);
  const [receiptError, setReceiptError] = useState("");
  const [receiptSubmitted, setReceiptSubmitted] = useState(false);
  const [receiptPath, setReceiptPath] = useState("");
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [savedAddresses, setSavedAddresses] = useState(addresses);
  const [selectedAddressId, setSelectedAddressId] = useState(
    addresses.find((address) => address.is_default)?.id ??
      addresses[0]?.id ??
      ""
  );
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [deliveryZoneName, setDeliveryZoneName] = useState("");
  const [deliveryFeeLoading, setDeliveryFeeLoading] = useState(false);
  const [deliveryFeeError, setDeliveryFeeError] = useState("");
  const [fulfillmentType, setFulfillmentType] = useState<
    "pickup" | "delivery"
  >("pickup");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    "cash_on_pickup"
  );
  //* Automatically select the appropriate cash option when fulfillment changes.*
  useEffect(() => {
    setPaymentMethod(
      fulfillmentType === "pickup"
        ? "cash_on_pickup"
        : "cash_on_delivery"
    );
  }, [fulfillmentType]);
  const [showAddressForm, setShowAddressForm] = useState(
    addresses.length === 0
  );
  const [addressForm, setAddressForm] = useState(emptyAddressForm);
  const [savingAddress, setSavingAddress] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(
    null
  );
  const [addressError, setAddressError] = useState("");
  const [addressSuccess, setAddressSuccess] = useState("");
  //* Automatically calculate the delivery fee based on the selected barangay.*
  useEffect(() => {
    let cancelled = false;
    async function calculateDeliveryFee() {
      setDeliveryFee(null);
      setDeliveryZoneName("");
      setDeliveryFeeError("");
      if (fulfillmentType !== "delivery") {
        setDeliveryFeeLoading(false);
        return;
      }
      const address = savedAddresses.find(
        (item) => item.id === selectedAddressId
      );
      if (!address) {
        setDeliveryFeeLoading(false);
        return;
      }
      if (
        address.city.trim().toLowerCase() !== "davao city" ||
        address.province.trim().toLowerCase() !== "davao del sur"
      ) {
        setDeliveryFeeError(
          "BakeCart currently delivers only within Davao City."
        );
        setDeliveryFeeLoading(false);
        return;
      }
      setDeliveryFeeLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("delivery_zones")
          .select("zone_name, barangay, delivery_fee")
          .eq("city", "Davao City")
          .eq("province", "Davao del Sur")
          .eq("is_active", true);
        if (error) {
          throw new Error("Unable to calculate delivery fee.");
        }
        const matchingZone = data?.find(
          (zone) =>
            zone.barangay.trim().toLowerCase() ===
            address.barangay.trim().toLowerCase()
        );
        if (!matchingZone) {
          throw new Error(
            "Sorry, delivery is not available for this barangay yet."
          );
        }
        if (!cancelled) {
          setDeliveryFee(Number(matchingZone.delivery_fee));
          setDeliveryZoneName(matchingZone.zone_name);
        }
      } catch (error) {
        if (!cancelled) {
          setDeliveryFeeError(
            error instanceof Error
              ? error.message
              : "Unable to calculate delivery fee."
          );
        }
      } finally {
        if (!cancelled) {
          setDeliveryFeeLoading(false);
        }
      }
    }
    calculateDeliveryFee();
    return () => {
      cancelled = true;
    };
  }, [fulfillmentType, selectedAddressId, savedAddresses]);
  const handleAddressChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setAddressForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };
  const handleSaveAddress = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setAddressError("");
    setAddressSuccess("");
    setSavingAddress(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("Your session has expired. Please sign in again.");
      }
      const { data, error } = await supabase
        .from("customer_addresses")
        .insert({
          user_id: user.id,
          recipient_name: addressForm.recipient_name.trim(),
          phone: addressForm.phone.trim(),
          address_line: addressForm.address_line.trim(),
          barangay: addressForm.barangay.trim(),
          city: addressForm.city.trim(),
          province: addressForm.province.trim(),
          postal_code: addressForm.postal_code.trim() || null,
          delivery_instructions:
            addressForm.delivery_instructions.trim() || null,
          is_default: savedAddresses.length === 0,
        })
        .select(
          "id, recipient_name, phone, address_line, barangay, city, province, postal_code, delivery_instructions, is_default"
        )
        .single();
      if (error) {
        throw new Error(error.message);
      }
      setSavedAddresses((previous) => [...previous, data]);
      setSelectedAddressId(data.id);
      setAddressForm(emptyAddressForm);
      setShowAddressForm(false);
      setAddressSuccess("Your delivery address has been saved!");
      setAddressError("");
    } catch (error) {
      setAddressError(
        error instanceof Error
          ? error.message
          : "Unable to save your address. Please try again."
      );
    } finally {
      setSavingAddress(false);
    }
  };
  //* Delete a saved address belonging to the signed-in customer.*
  const handleDeleteAddress = async (addressId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this saved address?"
    );
    if (!confirmed) return;
    setAddressError("");
    setAddressSuccess("");
    setDeletingAddressId(addressId);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("customer_addresses")
        .delete()
        .eq("id", addressId);
      if (error) {
        throw new Error(error.message);
      }
      const remainingAddresses = savedAddresses.filter(
        (address) => address.id !== addressId
      );
      setSavedAddresses(remainingAddresses);
      if (selectedAddressId === addressId) {
        setSelectedAddressId(
          remainingAddresses.find((address) => address.is_default)?.id ??
            remainingAddresses[0]?.id ??
            ""
        );
      }
      if (remainingAddresses.length === 0) {
        setShowAddressForm(true);
      }
      setAddressSuccess("Address deleted successfully.");
    } catch (error) {
      setAddressError(
        error instanceof Error
          ? error.message
          : "Unable to delete this address. Please try again."
      );
    } finally {
      setDeletingAddressId(null);
    }
  };
  //* Submit the order and create its pending payment record securely.*
  const handlePlaceOrder = async () => {
    setCheckoutError("");
    if (!fullName.trim() || !phone.trim()) {
      setCheckoutError("Please complete your name and contact number.");
      return;
    }
    if (fulfillmentType === "delivery") {
      if (!selectedAddressId || !selectedAddress) {
        setCheckoutError("Please select a delivery address.");
        return;
      }
      if (deliveryFeeLoading || deliveryFee === null || deliveryFeeError) {
        setCheckoutError(
          deliveryFeeError || "Please wait for the delivery fee calculation."
        );
        return;
      }
    }
if (items.length === 0) {
      setCheckoutError("Your cart is empty.");
      return;
    }
    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const orderItems = items.map((item) => ({
        product_id: item.productId,
        variant_id: item.variantId,
        quantity: item.quantity,
        ...(item.customCake
          ? {
              custom_cake: {
                options: item.customCake.options.map((option) => ({
                  option_id: option.id,
                })),
                cake_message: item.customCake.cakeMessage,
                special_instructions: item.customCake.specialInstructions,
                reference_image_path: item.customCake.referenceImagePath,
              },
            }
          : {}),
      }));
      const { data, error } = await supabase.rpc(
        "create_checkout_order_with_payment",
        {
          p_items: orderItems,
          p_fulfillment_type: fulfillmentType,
          p_slot_id: null,
          p_full_name: fullName.trim(),
          p_phone: phone.trim(),
          p_payment_method: paymentMethod,
          p_address_id:
            fulfillmentType === "delivery" ? selectedAddressId : null,
          p_customer_notes: null,
        }
      );
      if (error) {
        throw new Error(error.message);
      }
      const result = data as CreatedOrder;
      if (
        !result?.success ||
        !result.order_number ||
        !result.payment_reference
      ) {
        throw new Error("Unable to confirm your order. Please try again.");
      }
      setCreatedOrder(result);
      clearCart();
    } catch (error) {
      setCheckoutError(
        error instanceof Error
          ? error.message
          : "Something went wrong while placing your order."
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleSubmitPaymentReceipt = async () => {
  setReceiptError("");
  if (!createdOrder) {
    setReceiptError("Order information is missing. Please refresh and try again.");
    return;
  }
  const reference = customerReference.trim();
  if (reference.length < 3 || reference.length > 100) {
    setReceiptError("Please enter a valid transaction reference (3–100 characters).");
    return;
  }
  if (!receiptFile && !receiptPath) {
    setReceiptError("Please select your payment receipt image.");
    return;
  }
  if (
    receiptFile &&
    !["image/jpeg", "image/png", "image/webp"].includes(receiptFile.type)
  ) {
    setReceiptError("Only JPG, PNG, and WebP images are accepted.");
    return;
  }
  if (receiptFile && receiptFile.size > 5 * 1024 * 1024) {
    setReceiptError("Your receipt image must be 5MB or smaller.");
    return;
  }
  setReceiptSubmitting(true);
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Please sign in again before submitting your receipt.");
    }
    let path = receiptPath;
    if (!path && receiptFile) {
      const extension =
        receiptFile.type === "image/jpeg"
          ? "jpg"
          : receiptFile.type === "image/png"
            ? "png"
            : "webp";
      path = `${user.id}/${createdOrder.order_id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("payment-receipts")
        .upload(path, receiptFile, {
          contentType: receiptFile.type,
          upsert: false,
        });
      if (uploadError) {
        throw new Error(uploadError.message);
      }
      setReceiptPath(path);
    }
    const { error: submitError } = await supabase.rpc(
      "submit_payment_receipt",
      {
        p_order_id: createdOrder.order_id,
        p_customer_reference: reference,
        p_receipt_path: path,
      }
    );
    if (submitError) {
      throw new Error(submitError.message);
    }
    setReceiptSubmitted(true);
  } catch (error) {
    setReceiptError(
      error instanceof Error
        ? error.message
        : "Something went wrong. Please try again."
    );
  } finally {
    setReceiptSubmitting(false);
  }
};
//* Successful order screen.*
  if (createdOrder) {
    const paymentMethodLabel: Record<PaymentMethod, string> = {
      cash_on_pickup: "Cash on Pickup",
      cash_on_delivery: "Cash on Delivery",
      gcash: "GCash",
      bank_transfer: "Bank Transfer",
    };
    const isCashPayment =
      createdOrder.payment_method === "cash_on_pickup" ||
      createdOrder.payment_method === "cash_on_delivery";
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fffaf5] px-6 py-16">
        <div className="w-full max-w-lg rounded-3xl border border-[#eadfd5] bg-white p-8 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-50 text-green-600">
            <ShieldCheck size={38} />
          </div>
          <p className="mt-7 text-xs font-semibold uppercase tracking-[0.25em] text-[#a86f52]">
            BakeCart
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-[#3d3029]">
            Order Successfully Placed!
          </h1>
          <p className="mt-3 text-sm leading-7 text-[#8b7b70]">
            Thank you for choosing BakeCart. Your order has been recorded
            successfully.
          </p>
          <div className="mt-8 rounded-2xl bg-[#fffaf5] p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-[#8b7b70]">
              Your Order Number
            </p>
            <p className="mt-2 break-all text-2xl font-bold tracking-wide text-[#a86f52]">
              {createdOrder.order_number}
            </p>
            <div className="my-5 border-t border-dashed border-[#eadfd5]" />
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-[#8b7b70]">Subtotal</span>
              <span className="font-medium text-[#3d3029]">
                ₱
                {createdOrder.subtotal.toLocaleString("en-PH", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="mt-3 flex justify-between gap-4 text-sm">
              <span className="text-[#8b7b70]">Delivery Fee</span>
              <span className="font-medium text-[#3d3029]">
                ₱
                {createdOrder.delivery_fee.toLocaleString("en-PH", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="my-4 border-t border-[#eadfd5]" />
            <div className="flex justify-between gap-4">
              <span className="font-semibold text-[#3d3029]">
                Total Amount
              </span>
              <span className="text-xl font-bold text-[#a86f52]">
                ₱
                {createdOrder.total_amount.toLocaleString("en-PH", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
          <div className="mt-6 rounded-xl border border-[#eadfd5] bg-white p-4 text-left">
            <p className="text-sm font-semibold text-[#3d3029]">
              Payment Details
            </p>
            <div className="mt-3 flex justify-between gap-3 text-sm">
              <span className="text-[#8b7b70]">Payment Method</span>
              <span className="text-right font-medium text-[#3d3029]">
                {paymentMethodLabel[createdOrder.payment_method]}
              </span>
            </div>
            <div className="mt-3">
              <p className="text-xs text-[#8b7b70]">
                Payment Record Reference
              </p>
              <p className="mt-1 break-all text-sm font-semibold text-[#a86f52]">
                {createdOrder.payment_reference}
              </p>
            </div>
          </div>
{isCashPayment ? (
  <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left">
    <p className="text-sm font-semibold text-amber-800">
      Payment Pending
    </p>
    <p className="mt-1 text-xs leading-6 text-amber-700">
      Please pay when you collect your order or when it is delivered.
      The administrator will record your payment.
    </p>
  </div>
) : (
  <div className="mt-6 rounded-xl border border-[#eadfd5] bg-white p-5 text-left">
    {receiptSubmitted ? (
      <div className="rounded-xl bg-green-50 p-4">
        <p className="font-semibold text-green-800">
          Receipt Submitted Successfully!
        </p>
        <p className="mt-1 text-sm leading-6 text-green-700">
          Your payment receipt and transaction reference have been
          submitted. Please wait for the administrator to verify
          your payment.
        </p>
        <p className="mt-3 text-xs font-semibold text-green-800">
          Payment status: Awaiting verification
        </p>
      </div>
    ) : (
      <>
        <p className="text-sm font-semibold text-[#3d3029]">
          Submit Your Payment Receipt
        </p>
        <p className="mt-2 text-xs leading-6 text-[#8b7b70]">
          Please complete your payment using your selected payment
          method, then upload your receipt and enter your transaction
          reference below.
        </p>
        <div className="mt-5">
          <label className="text-sm font-medium text-[#3d3029]">
            Transaction Reference Number
          </label>
          <input
            type="text"
            value={customerReference}
            onChange={(event) =>
              setCustomerReference(event.target.value)
            }
            placeholder="Enter your transaction reference"
            maxLength={100}
            className="mt-2 w-full rounded-xl border border-[#eadfd5] px-4 py-3 text-sm outline-none focus:border-[#a86f52]"
          />
        </div>
        <div className="mt-5">
          <label className="text-sm font-medium text-[#3d3029]">
            Upload Payment Receipt
          </label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              setReceiptFile(event.target.files?.[0] ?? null);
              setReceiptError("");
            }}
            className="mt-2 block w-full rounded-xl border border-[#eadfd5] p-3 text-sm text-[#8b7b70] file:mr-3 file:rounded-full file:border-0 file:bg-[#f3e5d8] file:px-4 file:py-2 file:text-xs file:font-semibold file:text-[#a86f52]"
          />
          <p className="mt-2 text-xs text-[#8b7b70]">
            Accepted formats: JPG, PNG, WebP. Maximum size: 5MB.
          </p>
          {receiptFile && (
            <p className="mt-2 break-all text-xs text-[#a86f52]">
              Selected: {receiptFile.name}
            </p>
          )}
        </div>
        {receiptError && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-xs leading-5 text-red-700">
            {receiptError}
          </p>
        )}
        <button
          type="button"
          onClick={handleSubmitPaymentReceipt}
          disabled={receiptSubmitting}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#a86f52] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#8f5c43] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {receiptSubmitting
            ? "Submitting Receipt..."
            : "Submit Payment Receipt"}
        </button>
      </>
    )}
  </div>
)}
        </div>
      </main>
    );
  }
  // Empty cart screen.
  if (items.length === 0) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-[#fffaf5] px-6">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#f3e5d8] text-[#a86f52]">
            <ShoppingBag size={34} />
          </div>
          <h1 className="mt-6 text-3xl font-semibold text-[#3d3029]">
            Your cart is empty
          </h1>
          <p className="mt-3 leading-7 text-[#8b7b70]">
            Looks like you haven't added any delicious treats yet.
            Let's find something freshly baked for you!
          </p>
          <Link
            href="/products"
            className="mt-7 inline-flex rounded-full bg-[#a86f52] px-8 py-3 font-medium text-white transition hover:bg-[#8f5c43]"
          >
            Explore Our Products
          </Link>
        </div>
      </main>
    );
  }
  const subtotal = getSubtotal();
  const selectedAddress = savedAddresses.find(
    (address) => address.id === selectedAddressId
  );
  const estimatedTotal =
    fulfillmentType === "pickup"
      ? subtotal
      : deliveryFee !== null
        ? subtotal + deliveryFee
        : null;
  const availablePaymentMethods = [
    {
      value:
        fulfillmentType === "pickup"
          ? ("cash_on_pickup" as const)
          : ("cash_on_delivery" as const),
      title:
        fulfillmentType === "pickup"
          ? "Cash on Pickup"
          : "Cash on Delivery",
      description:
        fulfillmentType === "pickup"
          ? "Pay when you collect your order at the store."
          : "Pay when your order arrives at your address.",
    },
    {
      value: "gcash" as const,
      title: "GCash",
      description: "Pay through GCash and submit your payment proof.",
    },
    {
      value: "bank_transfer" as const,
      title: "Bank Transfer",
      description: "Pay through bank transfer and submit your payment proof.",
    },
  ];
  return (
    <main className="min-h-screen bg-[#fffaf5] pb-20">
      <div className="mx-auto max-w-6xl px-5 pt-10 sm:px-8 lg:pt-14">
        <Link
          href="/cart"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#8b7b70] transition hover:text-[#a86f52]"
        >
          <ArrowLeft size={16} />
          Return to cart
        </Link>
        <div className="mt-9">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#a86f52]">
            BakeCart
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#3d3029] sm:text-5xl">
            Checkout
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-7 text-[#8b7b70]">
            You're one step closer to enjoying your freshly baked favorites.
          </p>
        </div>
        <div className="mt-10 grid items-start gap-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-8">
            {/** Customer Information **/}
            <section className="rounded-3xl border border-[#eadfd5] bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-3">
                <User className="text-[#a86f52]" size={22} />
                <div>
                  <h2 className="text-xl font-semibold text-[#3d3029]">
                    Customer Information
                  </h2>
                  <p className="mt-1 text-sm text-[#8b7b70]">
                    Confirm your contact details.
                  </p>
                </div>
              </div>
              <div className="mt-7 space-y-5">
                <div>
                  <label
                    htmlFor="fullName"
                    className="mb-2 block text-sm font-medium text-[#3d3029]"
                  >
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    required
                    className="w-full rounded-xl border border-[#eadfd5] bg-white px-4 py-3 text-sm text-[#3d3029] outline-none transition focus:border-[#a86f52]"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label
                    htmlFor="phone"
                    className="mb-2 block text-sm font-medium text-[#3d3029]"
                  >
                    Contact Number
                  </label>
                  <div className="relative">
                    <Phone
                      size={17}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a86f52]"
                    />
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      required
                      className="w-full rounded-xl border border-[#eadfd5] bg-white py-3 pl-11 pr-4 text-sm text-[#3d3029] outline-none transition focus:border-[#a86f52]"
                      placeholder="09XXXXXXXXX"
                    />
                  </div>
                </div>
              </div>
            </section>
            {/** Fulfillment Method **/}
            <section className="rounded-3xl border border-[#eadfd5] bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-3">
                <Truck className="text-[#a86f52]" size={22} />
                <div>
                  <h2 className="text-xl font-semibold text-[#3d3029]">
                    Fulfillment Method
                  </h2>
                  <p className="mt-1 text-sm text-[#8b7b70]">
                    How would you like to receive your order?
                  </p>
                </div>
              </div>
              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setFulfillmentType("pickup")}
                  className={`rounded-2xl border p-5 text-left transition ${
                    fulfillmentType === "pickup"
                      ? "border-[#a86f52] bg-[#fffaf5]"
                      : "border-[#eadfd5] hover:border-[#c9a58e]"
                  }`}
                >
                  <ShoppingBag className="mb-3 text-[#a86f52]" size={24} />
                  <p className="font-semibold text-[#3d3029]">Store Pickup</p>
                  <p className="mt-1 text-xs text-[#8b7b70]">
                    Pick up your order at our store.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setFulfillmentType("delivery")}
                  className={`rounded-2xl border p-5 text-left transition ${
                    fulfillmentType === "delivery"
                      ? "border-[#a86f52] bg-[#fffaf5]"
                      : "border-[#eadfd5] hover:border-[#c9a58e]"
                  }`}
                >
                  <Truck className="mb-3 text-[#a86f52]" size={24} />
                  <p className="font-semibold text-[#3d3029]">Delivery</p>
                  <p className="mt-1 text-xs text-[#8b7b70]">
                    Have your order delivered to your address.
                  </p>
                </button>
              </div>
            </section>
            {/** Payment Method **/}
            <section className="rounded-3xl border border-[#eadfd5] bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-[#a86f52]" size={22} />
                <div>
                  <h2 className="text-xl font-semibold text-[#3d3029]">
                    Payment Method
                  </h2>
                  <p className="mt-1 text-sm text-[#8b7b70]">
                    Choose how you would like to pay.
                  </p>
                </div>
              </div>
              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                {availablePaymentMethods.map((method) => {
                  const selected = paymentMethod === method.value;
                  return (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setPaymentMethod(method.value)}
                      className={`rounded-2xl border p-5 text-left transition ${
                        selected
                          ? "border-[#a86f52] bg-[#fffaf5] ring-1 ring-[#a86f52]"
                          : "border-[#eadfd5] hover:border-[#c9a58e]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-[#3d3029]">
                          {method.title}
                        </p>
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                            selected
                              ? "border-[#a86f52] bg-[#a86f52]"
                              : "border-[#c9b8aa]"
                          }`}
                        >
                          {selected && (
                            <span className="h-2 w-2 rounded-full bg-white" />
                          )}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-6 text-[#8b7b70]">
                        {method.description}
                      </p>
                    </button>
                  );
                })}
              </div>
              <div className="mt-5 rounded-xl bg-[#fffaf5] p-4">
                <p className="text-xs leading-6 text-[#8b7b70]">
                  {paymentMethod === "cash_on_pickup" ||
                  paymentMethod === "cash_on_delivery"
                    ? "Cash payments will be collected when your order is picked up or delivered. The administrator will record your payment."
                    : "Online payments currently use manual verification. You will need to provide your payment reference and receipt for administrator verification. Receipt submission is not available yet."}
                </p>
              </div>
            </section>
            {/** Pickup and Delivery Arrangement **/}
            <section className="rounded-3xl border border-[#eadfd5] bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-3">
                <Truck className="text-[#a86f52]" size={22} />
                <div>
                  <h2 className="text-xl font-semibold text-[#3d3029]">
                    Pickup &amp; Delivery Arrangement
                  </h2>
                  <p className="mt-1 text-sm text-[#8b7b70]">
                    Open 24 hours, 7 days a week
                  </p>
                </div>
              </div>
              <p className="mt-6 rounded-xl bg-[#fffaf5] p-4 text-sm leading-7 text-[#8b7b70]">
                BakeCart is open 24/7. Once we review your order, our team will
                contact you to confirm your pickup or delivery arrangement.
                Orders are subject to confirmation and preparation availability.
              </p>
            </section>
            {/** Delivery Address **/}
            {fulfillmentType === "delivery" && (
              <section className="rounded-3xl border border-[#eadfd5] bg-white p-6 shadow-sm sm:p-8">
                <div className="flex items-center gap-3">
                  <MapPin className="text-[#a86f52]" size={22} />
                  <div>
                    <h2 className="text-xl font-semibold text-[#3d3029]">
                      Delivery Address
                    </h2>
                    <p className="mt-1 text-sm text-[#8b7b70]">
                      Choose a saved address or add a new one.
                    </p>
                  </div>
                </div>
                {addressSuccess && (
                  <p className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-700">
                    {addressSuccess}
                  </p>
                )}
                {addressError && (
                  <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                    {addressError}
                  </p>
                )}
                {savedAddresses.length > 0 && (
                  <div className="mt-7 space-y-4">
                    {savedAddresses.map((address) => (
                      <div
                        key={address.id}
                        className={`rounded-2xl border p-4 transition ${
                          selectedAddressId === address.id
                            ? "border-[#a86f52] bg-[#fffaf5]"
                            : "border-[#eadfd5] hover:border-[#c9a58e]"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="deliveryAddress"
                            value={address.id}
                            checked={selectedAddressId === address.id}
                            onChange={() => setSelectedAddressId(address.id)}
                            className="mt-1 accent-[#a86f52]"
                            aria-label={`Select address for ${address.recipient_name}`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-[#3d3029]">
                                {address.recipient_name}
                              </p>
                              {address.is_default && (
                                <span className="rounded-full bg-[#f3e5d8] px-2 py-1 text-[10px] font-semibold text-[#8f5c43]">
                                  DEFAULT
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-[#8b7b70]">
                              {address.phone}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-[#6f5b50]">
                              {address.address_line}, {address.barangay},{" "}
                              {address.city}, {address.province}
                              {address.postal_code
                                ? ` ${address.postal_code}`
                                : ""}
                            </p>
                            {address.delivery_instructions && (
                              <p className="mt-2 text-xs text-[#8b7b70]">
                                Instructions: {address.delivery_instructions}
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteAddress(address.id)}
                              disabled={deletingAddressId !== null}
                              className="mt-4 inline-flex items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {deletingAddressId === address.id ? (
                                <>
                                  <Loader2
                                    size={14}
                                    className="animate-spin"
                                  />
                                  Deleting...
                                </>
                              ) : (
                                <>
                                  <Trash2 size={14} />
                                  Delete Address
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {!showAddressForm && (
                  <button
                    type="button"
                    onClick={() => {
                      setAddressError("");
                      setAddressSuccess("");
                      setShowAddressForm(true);
                    }}
                    className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#a86f52] px-5 py-2.5 text-sm font-medium text-[#a86f52] transition hover:bg-[#fffaf5]"
                  >
                    <Plus size={17} />
                    Add New Address
                  </button>
                )}
                {showAddressForm && (
                  <form
                    onSubmit={handleSaveAddress}
                    className="mt-7 rounded-2xl border border-[#eadfd5] bg-[#fffaf5] p-5 sm:p-6"
                  >
                    <h3 className="text-lg font-semibold text-[#3d3029]">
                      Add New Delivery Address
                    </h3>
                    <p className="mt-1 text-sm text-[#8b7b70]">
                      Enter the complete address where your order will be delivered.
                    </p>
                    <div className="mt-6 grid gap-5 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label
                          htmlFor="recipient_name"
                          className="mb-2 block text-sm font-medium text-[#3d3029]"
                        >
                          Recipient Name *
                        </label>
                        <input
                          id="recipient_name"
                          name="recipient_name"
                          value={addressForm.recipient_name}
                          onChange={handleAddressChange}
                          required
                          maxLength={120}
                          placeholder="Full name of recipient"
                          className="w-full rounded-xl border border-[#eadfd5] bg-white px-4 py-3 text-sm outline-none focus:border-[#a86f52]"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label
                          htmlFor="addressPhone"
                          className="mb-2 block text-sm font-medium text-[#3d3029]"
                        >
                          Contact Number *
                        </label>
                        <input
                          id="addressPhone"
                          name="phone"
                          type="tel"
                          value={addressForm.phone}
                          onChange={handleAddressChange}
                          required
                          maxLength={30}
                          placeholder="09XXXXXXXXX"
                          className="w-full rounded-xl border border-[#eadfd5] bg-white px-4 py-3 text-sm outline-none focus:border-[#a86f52]"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label
                          htmlFor="address_line"
                          className="mb-2 block text-sm font-medium text-[#3d3029]"
                        >
                          House Number / Street / Address *
                        </label>
                        <input
                          id="address_line"
                          name="address_line"
                          value={addressForm.address_line}
                          onChange={handleAddressChange}
                          required
                          maxLength={255}
                          placeholder="House number, street, subdivision, etc."
                          className="w-full rounded-xl border border-[#eadfd5] bg-white px-4 py-3 text-sm outline-none focus:border-[#a86f52]"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="barangay"
                          className="mb-2 block text-sm font-medium text-[#3d3029]"
                        >
                          Barangay *
                        </label>
                        <input
                          id="barangay"
                          name="barangay"
                          value={addressForm.barangay}
                          onChange={handleAddressChange}
                          required
                          maxLength={120}
                          placeholder="Enter barangay"
                          className="w-full rounded-xl border border-[#eadfd5] bg-white px-4 py-3 text-sm outline-none focus:border-[#a86f52]"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="city"
                          className="mb-2 block text-sm font-medium text-[#3d3029]"
                        >
                          City / Municipality *
                        </label>
                        <input
                          id="city"
                          name="city"
                          value={addressForm.city}
                          onChange={handleAddressChange}
                          required
                          maxLength={120}
                          placeholder="Enter city"
                          className="w-full rounded-xl border border-[#eadfd5] bg-white px-4 py-3 text-sm outline-none focus:border-[#a86f52]"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="province"
                          className="mb-2 block text-sm font-medium text-[#3d3029]"
                        >
                          Province *
                        </label>
                        <input
                          id="province"
                          name="province"
                          value={addressForm.province}
                          onChange={handleAddressChange}
                          required
                          maxLength={120}
                          placeholder="Enter province"
                          className="w-full rounded-xl border border-[#eadfd5] bg-white px-4 py-3 text-sm outline-none focus:border-[#a86f52]"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="postal_code"
                          className="mb-2 block text-sm font-medium text-[#3d3029]"
                        >
                          Postal Code
                        </label>
                        <input
                          id="postal_code"
                          name="postal_code"
                          value={addressForm.postal_code}
                          onChange={handleAddressChange}
                          maxLength={20}
                          placeholder="Optional"
                          className="w-full rounded-xl border border-[#eadfd5] bg-white px-4 py-3 text-sm outline-none focus:border-[#a86f52]"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label
                          htmlFor="delivery_instructions"
                          className="mb-2 block text-sm font-medium text-[#3d3029]"
                        >
                          Delivery Instructions
                        </label>
                        <textarea
                          id="delivery_instructions"
                          name="delivery_instructions"
                          value={addressForm.delivery_instructions}
                          onChange={handleAddressChange}
                          rows={3}
                          maxLength={500}
                          placeholder="Landmarks, directions, or other instructions (optional)"
                          className="w-full resize-y rounded-xl border border-[#eadfd5] bg-white px-4 py-3 text-sm outline-none focus:border-[#a86f52]"
                        />
                      </div>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <button
                        type="submit"
                        disabled={savingAddress}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-[#a86f52] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#8f5c43] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingAddress ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Saving Address...
                          </>
                        ) : (
                          "Save Address"
                        )}
                      </button>
                      {savedAddresses.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddressForm(false);
                            setAddressError("");
                          }}
                          className="rounded-full border border-[#eadfd5] px-6 py-3 text-sm font-medium text-[#8b7b70] transition hover:bg-white"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                )}
                {selectedAddress && (
                  <p className="mt-4 text-xs text-[#8b7b70]">
                    Selected address: {selectedAddress.barangay},{" "}
                    {selectedAddress.city}
                  </p>
                )}
              </section>
            )}
            {/** Order Items **/}
            <section className="rounded-3xl border border-[#eadfd5] bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-[#3d3029]">
                    Your Order
                  </h2>
                  <p className="mt-1 text-sm text-[#8b7b70]">
                    {totalItems} {totalItems === 1 ? "item" : "items"} in
                    your cart
                  </p>
                </div>
                <ShoppingBag className="text-[#a86f52]" size={23} />
              </div>
              <div className="mt-7 space-y-6">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 border-b border-[#f1e8e0] pb-6 last:border-0 last:pb-0"
                  >
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-[#f8f1eb]">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="96px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[#b69a85]">
                          <ShoppingBag size={28} />
                        </div>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-center">
                      <h3 className="font-semibold text-[#3d3029]">
                        {item.name}
                      </h3>
                      {item.variantName && (
                        <p className="mt-1 text-sm text-[#8b7b70]">
                          {item.variantName}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                          <div className="inline-flex items-center rounded-full border border-[#eadfd5] bg-white">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1 || isSubmitting}
                              aria-label="Decrease quantity"
                              className="p-2.5 text-[#3d3029] transition hover:text-[#a86f52] disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="min-w-8 text-center text-sm font-medium text-[#3d3029]">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              disabled={item.quantity >= item.stockQuantity || isSubmitting}
                              aria-label="Increase quantity"
                              className="p-2.5 text-[#3d3029] transition hover:text-[#a86f52] disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              <Plus size={14} />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#a86f52] transition hover:text-red-600 disabled:opacity-40"
                          >
                            <Trash2 size={14} />
                            Remove
                          </button>
                        </div>
{item.customCake && (
  <div className="mt-3 rounded-xl border border-[#eadfd5] bg-[#fffaf5] p-3">
    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#a86f52]">
      Your Cake Design
    </p>

    {(["flavor", "frosting", "decoration"] as const).map((type) => {
      const selected = item.customCake!.options.filter(
        (option) => option.type === type
      );

      if (selected.length === 0) return null;

      return (
        <p key={type} className="mt-1 text-xs text-[#6f5b4e]">
          <span className="font-semibold">
            {type === "flavor"
              ? "Flavor"
              : type === "frosting"
                ? "Frosting"
                : "Decorations"}:
          </span>{" "}
          {selected.map((option) => option.name).join(", ")}
        </p>
      );
    })}

    {item.customCake.cakeMessage && (
      <p className="mt-2 text-xs text-[#6f5b4e]">
        <span className="font-semibold">Cake Message:</span>{" "}
        {item.customCake.cakeMessage}
      </p>
    )}

    {item.customCake.specialInstructions && (
      <p className="mt-2 text-xs text-[#6f5b4e]">
        <span className="font-semibold">Special Instructions:</span>{" "}
        {item.customCake.specialInstructions}
      </p>
    )}

    {item.customCake.referenceImagePath && (
      <p className="mt-2 text-xs font-medium text-[#a86f52]">
        Reference image attached
      </p>
    )}
  </div>
)}
                      <p className="mt-2 font-semibold text-[#a86f52]">
                        ₱
                        {(item.price * item.quantity).toLocaleString(
                          "en-PH",
                          { minimumFractionDigits: 2 }
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
          {/** Order Summary **/}
          <aside className="rounded-3xl border border-[#eadfd5] bg-white p-6 shadow-sm sm:p-8 lg:sticky lg:top-28">
            <h2 className="text-xl font-semibold text-[#3d3029]">
              Order Summary
            </h2>
            <div className="mt-7 space-y-4 text-sm">
              <div className="flex justify-between gap-4 text-[#8b7b70]">
                <span>Subtotal</span>
                <span className="font-medium text-[#3d3029]">
                  ₱
                  {subtotal.toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between gap-4 text-[#8b7b70]">
                <span>Delivery Fee</span>
                <span className="text-right font-medium text-[#3d3029]">
                  {fulfillmentType === "pickup" ? (
                    "₱0.00"
                  ) : deliveryFeeLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin" />
                      Calculating...
                    </span>
                  ) : deliveryFee !== null ? (
                    `₱${deliveryFee.toLocaleString("en-PH", {
                      minimumFractionDigits: 2,
                    })}`
                  ) : (
                    "Not available"
                  )}
                </span>
              </div>
              {fulfillmentType === "delivery" && deliveryZoneName && (
                <p className="text-right text-xs text-[#8b7b70]">
                  Delivery zone: {deliveryZoneName}
                </p>
              )}
              {fulfillmentType === "delivery" && deliveryFeeError && (
                <p className="rounded-xl bg-red-50 p-3 text-xs leading-5 text-red-700">
                  {deliveryFeeError}
                </p>
              )}
              {fulfillmentType === "delivery" &&
                !deliveryFeeLoading &&
                !deliveryFeeError &&
                !selectedAddress && (
                  <p className="text-right text-xs text-[#8b7b70]">
                    Please select or add a delivery address.
                  </p>
                )}
            </div>
            <div className="my-6 border-t border-dashed border-[#eadfd5]" />
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-[#3d3029]">
                Estimated Total
              </span>
              <span className="text-2xl font-bold text-[#a86f52]">
                {estimatedTotal !== null
                  ? `₱${estimatedTotal.toLocaleString("en-PH", {
                      minimumFractionDigits: 2,
                    })}`
                  : "â€”"}
              </span>
            </div>
            <div className="mt-7 space-y-4 rounded-2xl bg-[#fffaf5] p-4">
              <div className="flex gap-3">
                <Truck
                  size={19}
                  className="mt-0.5 shrink-0 text-[#a86f52]"
                />
                <div>
                  <p className="text-sm font-medium text-[#3d3029]">
                    {fulfillmentType === "pickup"
                      ? "Store Pickup"
                      : "Home Delivery"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#8b7b70]">
                    "Our team will contact you to confirm your pickup or delivery arrangement."
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <ShieldCheck
                  size={19}
                  className="mt-0.5 shrink-0 text-[#a86f52]"
                />
                <div>
                  <p className="text-sm font-medium text-[#3d3029]">
                    Secure Checkout
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#8b7b70]">
                    Your order details will be validated securely before
                    submission.
                  </p>
                </div>
              </div>
            </div>
            {checkoutError && (
              <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-700">
                {checkoutError}
              </p>
            )}
            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={
                isSubmitting ||
                !fullName.trim() ||
                !phone.trim() ||
                (fulfillmentType === "delivery" &&
                  (!selectedAddress ||
                    deliveryFee === null ||
                    deliveryFeeLoading ||
                    !!deliveryFeeError))
              }
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#a86f52] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#8f5c43] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Placing Your Order...
                </>
              ) : (
                <>
                  <ShoppingBag size={18} />
                  Place Order
                </>
              )}
            </button>
            <p className="mt-4 text-center text-xs leading-5 text-[#8b7b70]">
              Your order details and available stock will be verified securely
              before submission.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
