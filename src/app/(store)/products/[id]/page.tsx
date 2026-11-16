
import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AddToCartButton from "./AddToCartButton";
import {
  ArrowLeft,
  Check,
  Clock,
  Package,
  ShoppingBag,
} from "lucide-react";

type Variant = {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
};

type Product = {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  image_url: string | null;
  product_type: string;
  is_available: boolean;
  is_featured: boolean;
  preparation_time: number;
  categories: { name: string } | null;
  product_variants: Variant[];
};

type InventoryRow = {
  product_id: string | null;
  variant_id: string | null;
  stock_quantity: number;
};

const categoryImages: Record<string, string> = {
  "Fresh Bread":
    "https://images.unsplash.com/photo-1509440159596-0249088772ff",
  Cakes:
    "https://images.unsplash.com/photo-1578985545062-69928b1d9587",
  Pastries:
    "https://images.unsplash.com/photo-1555507036-ab1f4038808a",
  Cookies:
    "https://images.unsplash.com/photo-1499636136210-6f4ee915583e",
};

function formatPrice(price: number) {
  return `₱${Number(price).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function ProductDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();

  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(`
      id,
      name,
      description,
      base_price,
      image_url,
      product_type,
      is_available,
      is_featured,
      preparation_time,
      categories!products_category_id_fkey(name),
      product_variants!product_variants_product_id_fkey(
        id,
        name,
        price,
        is_available
      )
    `)
    .eq("id", id)
    .eq("is_available", true)
    .single();

  if (error || !data) {
    notFound();
  }

  const product = data as unknown as Product;

  // Retrieve stock through our secure database function.
  const { data: inventoryData, error: inventoryError } =
    await supabase.rpc("get_public_product_inventory", {
      p_product_id: id,
    });

  if (inventoryError) {
    console.error("Inventory retrieval error:", inventoryError);
  }

  const inventoryRows = (inventoryData ?? []) as InventoryRow[];

  const categoryName = product.categories?.name ?? "";
  const image = product.image_url || categoryImages[categoryName];

  // Get the stock of regular products.
  const productStock =
    inventoryRows.find((item) => item.product_id === id)
      ?.stock_quantity ?? 0;

  // Get the stock of each cake variant.
  const productVariants = product.product_variants.map((variant) => {
    const stock =
      inventoryRows.find((item) => item.variant_id === variant.id)
        ?.stock_quantity ?? 0;

    return {
      ...variant,
      stockQuantity: stock,
    };
  });

  const isMadeToOrder = product.product_type === "made_to_order";

  const availableVariants = productVariants.filter(
    (variant) => variant.is_available && variant.stockQuantity > 0
  );

  const isInStock = isMadeToOrder
    ? availableVariants.length > 0
    : productStock > 0;

  // Prepare variants for the Add to Cart component.
  const cartVariants = productVariants.map((variant) => ({
    id: variant.id,
    name: variant.name,
    price: Number(variant.price),
    stockQuantity: variant.stockQuantity,
    isAvailable: variant.is_available,
  }));

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-sm text-[#8b7b70] transition hover:text-[#a86f52]"
        >
          <ArrowLeft size={16} />
          Back to our menu
        </Link>
      </div>

      <section className="mx-auto grid max-w-7xl gap-12 px-6 pb-24 md:grid-cols-2 md:gap-16">
        <div className="relative h-[420px] overflow-hidden bg-[#f3e5d8] md:h-[600px]">
          {image && (
            <img
              src={image}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          )}

          {product.is_featured && (
            <span className="absolute left-5 top-5 bg-[#7a5443] px-4 py-2 text-xs uppercase tracking-wider text-white">
              Featured Product
            </span>
          )}
        </div>

        <div className="flex flex-col justify-center py-4">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-[#a86f52]">
            {categoryName || "Our Bakery"}
          </p>

          <h1 className="mt-4 font-serif text-4xl leading-tight text-[#3d3029] md:text-5xl">
            {product.name}
          </h1>

          <p className="mt-6 text-sm leading-8 text-[#8b7b70]">
            {product.description ||
              "A delicious treat freshly prepared by our bakery."}
          </p>

          <div className="mt-8 border-y border-[#eadfd5] py-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#8b7b70]">
                Product price
              </span>

              <span className="font-serif text-2xl text-[#7a5443]">
                {formatPrice(product.base_price)}
              </span>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <span className="text-sm text-[#8b7b70]">
                Availability
              </span>

              <span
                className={`flex items-center gap-2 text-sm ${
                  isInStock ? "text-green-700" : "text-red-600"
                }`}
              >
                <Check size={15} />
                {isInStock ? "Available" : "Currently unavailable"}
              </span>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <span className="text-sm text-[#8b7b70]">
                Order type
              </span>

              <span className="text-sm text-[#7a5443]">
                {isMadeToOrder ? "Made to order" : "Ready made"}
              </span>
            </div>

            {isMadeToOrder && (
              <div className="mt-5 flex items-center justify-between">
                <span className="text-sm text-[#8b7b70]">
                  Preparation time
                </span>

                <span className="flex items-center gap-2 text-sm text-[#7a5443]">
                  <Clock size={15} />
                  {product.preparation_time} minutes
                </span>
              </div>
            )}

            {!isMadeToOrder && (
              <div className="mt-5 flex items-center justify-between">
                <span className="text-sm text-[#8b7b70]">
                  Available stock
                </span>

                <span className="flex items-center gap-2 text-sm text-[#7a5443]">
                  <Package size={15} />
                  {productStock} units
                </span>
              </div>
            )}
          </div>

          <AddToCartButton
            productId={product.id}
            name={product.name}
            price={Number(product.base_price)}
            image={image ?? null}
            stockQuantity={productStock}
            isAvailable={product.is_available}
            variants={isMadeToOrder ? cartVariants : []}
          />

          <div className="mt-8 border border-[#eadfd5] bg-[#f8f1e9] p-5">
            <div className="flex items-start gap-3">
              <ShoppingBag
                size={19}
                className="mt-1 shrink-0 text-[#a86f52]"
              />

              <div>
                <p className="font-serif text-lg text-[#3d3029]">
                  Made with care, just for you.
                </p>

                <p className="mt-2 text-xs leading-6 text-[#8b7b70]">
                  Our bakery prepares delicious treats for your
                  everyday cravings and special celebrations.
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/products"
            className="mt-8 inline-flex w-fit items-center gap-3 border border-[#7a5443] px-7 py-4 text-sm font-medium text-[#7a5443] transition hover:bg-[#7a5443] hover:text-white"
          >
            Continue Shopping
            <ArrowLeft size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
