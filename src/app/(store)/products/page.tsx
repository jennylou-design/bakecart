import { connection } from "next/server";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowRight,
  CakeSlice,
  Cookie,
  Croissant,
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
  is_featured: boolean;
  categories: { name: string } | null;
  product_variants: Variant[];
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

const categoryIcons: Record<string, typeof CakeSlice> = {
  "Fresh Bread": Croissant,
  Cakes: CakeSlice,
  Pastries: Croissant,
  Cookies: Cookie,
};

function formatPrice(price: number) {
  return `₱${Number(price).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function ProductsPage() {
  const supabase = await createClient();

  const [{ data: categories, error: categoryError }, { data, error }] =
    await Promise.all([
      supabase
        .from("categories")
        .select("id, name")
        .eq("is_active", true)
        .order("name"),

      supabase
        .from("products")
        .select(`
          id,
          name,
          description,
          base_price,
          image_url,
          product_type,
          is_featured,
          categories(name),
          product_variants(
            id,
            name,
            price,
            is_available
          )
        `)
        .eq("is_available", true)
        .order("name"),
    ]);

  if (error || categoryError) {
    console.error("Product catalog error:", error || categoryError);

    return (
      <div className="mx-auto max-w-7xl px-6 py-24 text-center">
        <h1 className="font-serif text-3xl text-[#3d3029]">
          Something went wrong.
        </h1>
        <p className="mt-3 text-sm text-[#8b7b70]">
          We couldn't load our bakery menu. Please try again later.
        </p>
      </div>
    );
  }

  const products = (data ?? []) as unknown as Product[];

  return (
    <div className="min-h-screen">
      {/* Page Heading */}
      <section className="bg-[#f8f1e9] px-6 py-20 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-[#a86f52]">
          Fresh from our bakery
        </p>

        <h1 className="mt-4 font-serif text-5xl text-[#3d3029] md:text-6xl">
          Our Menu
        </h1>

        <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-[#8b7b70]">
          Discover your next favorite treat. Every item is
          thoughtfully made to bring sweetness to your day.
        </p>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-[#8b7b70]">
          <ShoppingBag size={15} />
          {products.length} delicious treats to explore
        </div>
      </section>

      {/* Category Navigation */}
      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-wrap justify-center gap-3">
          <a
            href="#all"
            className="border border-[#7a5443] bg-[#7a5443] px-5 py-3 text-xs text-white"
          >
            All Products
          </a>

          {categories?.map((category) => {
            const Icon = categoryIcons[category.name] ?? Cookie;

            return (
              <a
                key={category.id}
                href={`#${category.id}`}
                className="flex items-center gap-2 border border-[#eadfd5] px-5 py-3 text-xs text-[#7a5443] transition hover:bg-[#f3e5d8]"
              >
                <Icon size={15} />
                {category.name}
              </a>
            );
          })}
        </div>
      </section>

      {/* Product Categories */}
      <section
        id="all"
        className="mx-auto max-w-7xl space-y-20 px-6 pb-24 pt-8"
      >
        {categories?.map((category) => {
          const categoryProducts = products.filter(
            (product) => product.categories?.name === category.name
          );

          if (categoryProducts.length === 0) return null;

          return (
            <div
              key={category.id}
              id={category.id}
              className="scroll-mt-32"
            >
              <div className="mb-8 flex items-end justify-between border-b border-[#eadfd5] pb-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#a86f52]">
                    Freshly made for you
                  </p>

                  <h2 className="mt-2 font-serif text-3xl text-[#3d3029] md:text-4xl">
                    {category.name}
                  </h2>
                </div>

                <span className="text-xs text-[#8b7b70]">
                  {categoryProducts.length} items
                </span>
              </div>

              <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {categoryProducts.map((product) => {
                  const availableVariants =
                    product.product_variants?.filter(
                      (variant) => variant.is_available
                    ) ?? [];

                  const image =
                    product.image_url ||
                    categoryImages[category.name];

                  return (
                    <Link
                        href={`/products/${product.id}`}
                        key={product.id}
                        className="group block overflow-hidden border border-[#eadfd5] bg-white transition duration-300 hover:-translate-y-1 hover:shadow-lg"
                        >
                      <div className="relative h-64 overflow-hidden bg-[#f3e5d8]">
                        {image ? (
                          <img
                            src={image}
                            alt={product.name}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[#a86f52]">
                            <Cookie size={48} />
                          </div>
                        )}

                        {product.is_featured && (
                          <span className="absolute left-4 top-4 bg-[#7a5443] px-3 py-2 text-[10px] uppercase tracking-wider text-white">
                            Featured
                          </span>
                        )}

                        <span className="absolute bottom-4 right-4 bg-[#fffaf5] px-3 py-2 text-[10px] uppercase tracking-wider text-[#7a5443]">
                          {product.product_type === "made_to_order"
                            ? "Made to order"
                            : "Ready made"}
                        </span>
                      </div>

                      <div className="p-5">
                        <h3 className="font-serif text-xl text-[#3d3029]">
                          {product.name}
                        </h3>

                        <p className="mt-2 min-h-10 text-xs leading-6 text-[#8b7b70]">
                          {product.description}
                        </p>

                        {availableVariants.length > 0 ? (
                          <div className="mt-5 space-y-2 border-t border-[#eadfd5] pt-4">
                            {availableVariants.map((variant) => (
                              <div
                                key={variant.id}
                                className="flex justify-between text-xs"
                              >
                                <span className="text-[#8b7b70]">
                                  {variant.name}
                                </span>
                                <span className="font-medium text-[#7a5443]">
                                  {formatPrice(variant.price)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-5 border-t border-[#eadfd5] pt-4">
                            <span className="font-medium text-[#7a5443]">
                              {formatPrice(product.base_price)}
                            </span>
                          </div>
                        )}

                        <div className="mt-5 flex items-center justify-between text-xs text-[#a86f52]">
                          <span>
                            {product.product_type === "made_to_order"
                              ? "Prepared fresh for you"
                              : "Fresh bakery favorite"}
                          </span>
                          <ArrowRight size={16} />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      {/* Custom Cake Banner */}
      <section className="bg-[#f8f1e9] px-6 py-16 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-[#a86f52]">
          Something more personal?
        </p>

        <h2 className="mx-auto mt-4 max-w-xl font-serif text-4xl text-[#3d3029]">
          Create a cake made just for your celebration.
        </h2>

        <Link
          href="/custom-cake"
          className="mt-8 inline-flex items-center gap-3 bg-[#7a5443] px-7 py-4 text-sm text-white transition hover:bg-[#624333]"
        >
          Explore Custom Cakes
          <ArrowRight size={17} />
        </Link>
      </section>
    </div>
  );
}
