
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/lib/store/cart";

type ProductVariant = {
  id: string;
  name: string;
  price: number;
  stockQuantity: number;
  isAvailable: boolean;
};

type AddToCartButtonProps = {
  productId: string;
  name: string;
  price: number;
  image: string | null;
  stockQuantity: number;
  isAvailable: boolean;
  variants: ProductVariant[];
};

export default function AddToCartButton({
  productId,
  name,
  price,
  image,
  stockQuantity,
  isAvailable,
  variants,
}: AddToCartButtonProps) {
  const addItem = useCartStore((state) => state.addItem);
  const router = useRouter();

  const [selectedVariant, setSelectedVariant] =
    useState<ProductVariant | null>(null);

  const [quantity, setQuantity] = useState(1);

  const hasVariants = variants.length > 0;
  const currentPrice = selectedVariant?.price ?? price;
  const currentStock = selectedVariant?.stockQuantity ?? stockQuantity;

  const canPurchase =
    isAvailable &&
    currentStock > 0 &&
    (!hasVariants || selectedVariant !== null);

  function handleAddToCart() {
    if (!canPurchase) return;

    addItem({
      id: selectedVariant
        ? `${productId}-${selectedVariant.id}`
        : productId,
      productId,
      variantId: selectedVariant?.id ?? null,
      name,
      variantName: selectedVariant?.name ?? null,
      price: currentPrice,
      image,
      quantity,
      stockQuantity: currentStock,
    });

    toast.success(`${name} added to your cart!`);
    setQuantity(1);
  }

  function handleBuyNow() {
    if (!canPurchase) return;

    addItem({
      id: selectedVariant
        ? `${productId}-${selectedVariant.id}`
        : productId,
      productId,
      variantId: selectedVariant?.id ?? null,
      name,
      variantName: selectedVariant?.name ?? null,
      price: currentPrice,
      image,
      quantity,
      stockQuantity: currentStock,
    });

    router.push("/checkout");
  }
  return (
    <div className="mt-8 space-y-6">
      {hasVariants && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-[#3d3029]">
            Choose a size
          </h3>

          <div className="grid grid-cols-3 gap-3">
            {variants.map((variant) => {
              const isSelected = selectedVariant?.id === variant.id;
              const unavailable =
                !variant.isAvailable || variant.stockQuantity <= 0;

              function handleBuyNow() {
    if (!canPurchase) return;

    addItem({
      id: selectedVariant
        ? `${productId}-${selectedVariant.id}`
        : productId,
      productId,
      variantId: selectedVariant?.id ?? null,
      name,
      variantName: selectedVariant?.name ?? null,
      price: currentPrice,
      image,
      quantity,
      stockQuantity: currentStock,
    });

    router.push("/checkout");
  }
  return (
                <button
                  key={variant.id}
                  type="button"
                  disabled={unavailable}
                  onClick={() => {
                    setSelectedVariant(variant);
                    setQuantity(1);
                  }}
                  className={`rounded-xl border p-3 text-left transition ${
                    isSelected
                      ? "border-[#a86f52] bg-[#f3e5d8]"
                      : "border-[#eadfd5] bg-white hover:border-[#a86f52]"
                  } disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  <span className="block text-sm font-semibold text-[#3d3029]">
                    {variant.name}
                  </span>
                  <span className="mt-1 block text-sm text-[#8b7b70]">
                    ₱{variant.price.toLocaleString("en-PH")}
                  </span>
                </button>
              );
            })}
          </div>

          {!selectedVariant && (
            <p className="mt-2 text-xs text-[#8b7b70]">
              Please select a size before adding to cart.
            </p>
          )}
        </div>
      )}

      <div>
        <h3 className="mb-3 text-sm font-semibold text-[#3d3029]">
          Quantity
        </h3>

        <div className="flex items-center gap-4">
          <div className="flex items-center rounded-full border border-[#eadfd5]">
            <button
              type="button"
              onClick={() => setQuantity((current) => Math.max(1, current - 1))}
              disabled={quantity <= 1}
              className="p-3 text-[#3d3029] disabled:opacity-40"
              aria-label="Decrease quantity"
            >
              <Minus size={16} />
            </button>

            <span className="min-w-8 text-center text-sm font-medium">
              {quantity}
            </span>

            <button
              type="button"
              onClick={() =>
                setQuantity((current) =>
                  Math.min(current + 1, currentStock)
                )
              }
              disabled={!canPurchase || quantity >= currentStock}
              className="p-3 text-[#3d3029] disabled:opacity-40"
              aria-label="Increase quantity"
            >
              <Plus size={16} />
            </button>
          </div>

          <span className="text-xs text-[#8b7b70]">
            {currentStock > 0
              ? `${currentStock} available`
              : "Out of stock"}
          </span>
        </div>
      </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!canPurchase}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-[#a86f52] bg-white px-6 py-4 text-sm font-semibold text-[#a86f52] transition hover:bg-[#f8f1e9] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ShoppingBag size={18} />
          {!isAvailable || currentStock <= 0
            ? "Unavailable"
            : "Add to Cart"}
        </button>

        <button
          type="button"
          onClick={handleBuyNow}
          disabled={!canPurchase}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#a86f52] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#8f5b42] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ShoppingBag size={18} />
          Buy Now
        </button>
      </div>
    </div>
  );
}
