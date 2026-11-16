import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import CustomCakeBuilder from "./custom-cake-builder";

type CakeVariant = {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
};

type CakeProduct = {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  image_url: string | null;
  product_variants: CakeVariant[];
};

type CustomizationOption = {
  id: string;
  name: string;
  option_type: "flavor" | "frosting" | "decoration";
  additional_price: number;
};

type InventoryRow = {
  variant_id: string | null;
  stock_quantity: number;
};

export default async function CustomCakePage() {
  await connection();

  const supabase = await createClient();

  const { data: cakeData, error: cakeError } = await supabase
    .from("products")
    .select(`
      id,
      name,
      description,
      base_price,
      image_url,
      product_variants!product_variants_product_id_fkey(
        id,
        name,
        price,
        is_available
      )
    `)
    .eq("product_type", "made_to_order")
    .eq("is_available", true)
    .order("name");

  const { data: optionData, error: optionError } = await supabase
    .from("customization_options")
    .select("id, name, option_type, additional_price")
    .eq("is_active", true)
    .order("name");

  if (cakeError || optionError) {
    console.error("Custom cake data error:", cakeError || optionError);
    return (
      <main className="min-h-screen bg-[#fffaf5] px-6 py-24 text-center">
        <h1 className="font-serif text-3xl text-[#3d3029]">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm text-[#8b7b70]">
          We couldn't load our custom cake options. Please try again later.
        </p>
      </main>
    );
  }

  const cakes = (cakeData ?? []) as unknown as CakeProduct[];
  const options = (optionData ?? []) as CustomizationOption[];

  const cakesWithInventory = await Promise.all(
    cakes.map(async (cake) => {
      const { data: inventoryData, error: inventoryError } =
        await supabase.rpc("get_public_product_inventory", {
          p_product_id: cake.id,
        });

      if (inventoryError) {
        console.error(
          "Cake inventory error:",
          cake.name,
          inventoryError
        );
      }

      const inventory = (inventoryData ?? []) as InventoryRow[];

      return {
        ...cake,
        product_variants: cake.product_variants.map((variant) => ({
          ...variant,
          price: Number(variant.price),
          stockQuantity:
            inventory.find((row) => row.variant_id === variant.id)
              ?.stock_quantity ?? 0,
        })),
      };
    })
  );

  return (
    <CustomCakeBuilder
      cakes={cakesWithInventory}
      options={options.map((option) => ({
        ...option,
        additional_price: Number(option.additional_price),
      }))}
    />
  );
}
