
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CheckoutClient from "./checkout-client";

export default async function CheckoutPage() {
  const supabase = await createClient();

  // Verify the customer's authenticated session.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login?next=/checkout");
  }

  // Retrieve the customer's profile.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, phone, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "customer") {
    redirect("/");
  }

  // Retrieve the customer's saved addresses.
  const { data: addresses, error: addressError } = await supabase
    .from("customer_addresses")
    .select(
      "id, recipient_name, phone, address_line, barangay, city, province, postal_code, delivery_instructions, is_default"
    )
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (addressError) {
    throw new Error("Unable to load your saved addresses.");
  }

  return (
    <CheckoutClient
      profile={{
        full_name: profile.full_name,
        phone: profile.phone,
      }}
      addresses={addresses ?? []}
    />
  );
}
