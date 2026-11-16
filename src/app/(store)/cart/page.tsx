"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCartStore } from "@/lib/store/cart";
import {
  ArrowLeft,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  CakeSlice,
} from "lucide-react";

function formatPrice(price: number) {
  return `₱${price.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function CartPage() {
  const [isMounted, setIsMounted] = useState(false);

  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const clearCart = useCartStore((state) => state.clearCart);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[#fffaf5] px-6 py-20">
        <p className="text-center text-[#8b7b70]">
          Loading your cart...
        </p>
      </div>
    );
  }

  const subtotal = items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  return (
    <main className="min-h-screen bg-[#fffaf5] px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-sm text-[#8b7b70] hover:text-[#a86f52]"
        >
          <ArrowLeft size={16} />
          Continue Shopping
        </Link>

        <div className="mt-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[#a86f52]">
            Your Selections
          </p>

          <h1 className="mt-3 font-serif text-4xl text-[#3d3029]">
            Shopping Cart
          </h1>

          <p className="mt-3 text-sm text-[#8b7b70]">
            Review your freshly selected bakery treats.
          </p>
        </div>

        {items.length === 0 ? (
          <div className="mt-16 border border-[#eadfd5] bg-white px-6 py-20 text-center">
            <ShoppingBag
              size={42}
              className="mx-auto text-[#a86f52]"
            />

            <h2 className="mt-6 font-serif text-2xl text-[#3d3029]">
              Your cart is empty
            </h2>

            <p className="mt-3 text-sm text-[#8b7b70]">
              Looks like you haven't added anything yet.
            </p>

            <Link
              href="/products"
              className="mt-8 inline-flex rounded-full bg-[#a86f52] px-8 py-4 text-sm font-semibold text-white transition hover:bg-[#8f5b42]"
            >
              Explore Our Products
            </Link>
          </div>
        ) : (
          <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_350px]">
            <section className="space-y-6">
              <div className="flex items-center justify-between border-b border-[#eadfd5] pb-4">
                <p className="text-sm font-medium text-[#3d3029]">
                  {items.length} {items.length === 1 ? "item" : "items"}
                </p>

                <button
                  onClick={clearCart}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Clear Cart
                </button>
              </div>

              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-5 border-b border-[#eadfd5] pb-6"
                >
                  <div className="h-28 w-28 shrink-0 overflow-hidden bg-[#f3e5d8]">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[#a86f52]">
                        <ShoppingBag size={28} />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-serif text-lg text-[#3d3029]">
                            {item.name}
                          </h3>

                          {item.customCake && (
                            <span className="rounded-full bg-[#f3e5d8] px-2 py-1 text-[10px] font-medium text-[#8f5b42]">
                              CUSTOM CAKE
                            </span>
                          )}
                        </div>

                        {item.variantName && (
                          <p className="mt-1 text-xs text-[#8b7b70]">
                            Size: {item.variantName}
                          </p>
                        )}

                        <p className="mt-2 text-sm text-[#a86f52]">
                          {formatPrice(item.price)}
                        </p>
                      </div>

                      <button
                        onClick={() => removeItem(item.id)}
                        aria-label={`Remove ${item.name}`}
                        className="h-fit text-[#8b7b70] transition hover:text-red-500"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    {item.customCake && (
                      <div className="mt-4 space-y-3 rounded-xl border border-[#eadfd5] bg-[#fffaf5] p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-[#8f5b42]">
                          <CakeSlice size={16} />
                          Your Cake Design
                        </div>

                        <div className="space-y-2 text-xs text-[#8b7b70]">
                          {(["flavor", "frosting", "decoration"] as const).map(
                            (type) => {
                              const selected = item.customCake?.options.filter(
                                (option) => option.type === type
                              );

                              if (!selected?.length) return null;

                              return (
                                <div key={type}>
                                  <span className="font-semibold capitalize text-[#3d3029]">
                                    {type === "decoration"
                                      ? "Decorations"
                                      : type}
                                    :
                                  </span>{" "}
                                  {selected.map((option) => option.name).join(", ")}
                                </div>
                              );
                            }
                          )}

                          {item.customCake.cakeMessage && (
                            <div>
                              <span className="font-semibold text-[#3d3029]">
                                Cake message:
                              </span>{" "}
                              {item.customCake.cakeMessage}
                            </div>
                          )}

                          {item.customCake.specialInstructions && (
                            <div>
                              <span className="font-semibold text-[#3d3029]">
                                Special instructions:
                              </span>{" "}
                              {item.customCake.specialInstructions}
                            </div>
                          )}

                          {item.customCake.referenceImagePath && (
                            <p className="text-[#a86f52]">
                              Reference image attached
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="mt-5 flex items-center justify-between">
                      <div className="flex items-center rounded-full border border-[#eadfd5]">
                        <button
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                          disabled={item.quantity <= 1}
                          className="p-2 text-[#3d3029] disabled:opacity-30"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={14} />
                        </button>

                        <span className="min-w-8 text-center text-sm">
                          {item.quantity}
                        </span>

                        <button
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                          disabled={item.quantity >= item.stockQuantity}
                          className="p-2 text-[#3d3029] disabled:opacity-30"
                          aria-label="Increase quantity"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <p className="font-medium text-[#3d3029]">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </section>

            <aside className="h-fit border border-[#eadfd5] bg-white p-7">
              <h2 className="font-serif text-2xl text-[#3d3029]">
                Order Summary
              </h2>

              <div className="mt-7 flex justify-between text-sm text-[#8b7b70]">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>

              <div className="mt-4 flex justify-between text-sm text-[#8b7b70]">
                <span>Delivery fee</span>
                <span>Calculated at checkout</span>
              </div>

              <div className="my-6 border-t border-[#eadfd5]" />

              <div className="flex justify-between">
                <span className="font-medium text-[#3d3029]">
                  Total
                </span>

                <span className="font-serif text-xl text-[#a86f52]">
                  {formatPrice(subtotal)}
                </span>
              </div>

              <p className="mt-4 text-xs leading-6 text-[#8b7b70]">
                Delivery fees and fulfillment details will be confirmed
                during checkout.
              </p>

                            <Link
                href="/checkout"
                className="mt-7 flex w-full items-center justify-center rounded-full bg-[#a86f52] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#8f5b42]"
              >
                Proceed to Checkout →
              </Link>

              <Link
                href="/products"
                className="mt-5 flex w-full items-center justify-center gap-2 border border-[#a86f52] px-5 py-4 text-sm font-medium text-[#a86f52] transition hover:bg-[#a86f52] hover:text-white"
              >
                <ArrowLeft size={16} />
                Continue Shopping
              </Link>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
