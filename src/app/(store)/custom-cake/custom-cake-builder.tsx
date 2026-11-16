"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  CakeSlice,
  Check,
  ChevronRight,
  Heart,
  ImagePlus,
  Loader2,
  Sparkles,
  ShoppingBag,
  X,
} from "lucide-react";
import { useCartStore } from "@/lib/store/cart";
import { createClient } from "@/lib/supabase/client";

type CakeVariant = {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
  stockQuantity: number;
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

type Props = {
  cakes: CakeProduct[];
  options: CustomizationOption[];
};

const steps = [
  { number: "01", title: "Cake Basics" },
  { number: "02", title: "Make It Yours" },
  { number: "03", title: "Review" },
];

function formatPrice(price: number) {
  return `₱${price.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function CustomCakeBuilder({ cakes, options }: Props) {
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);

  const [step, setStep] = useState(1);
  const [selectedCakeId, setSelectedCakeId] = useState(cakes[0]?.id ?? "");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [selectedFlavor, setSelectedFlavor] = useState("");
  const [selectedFrosting, setSelectedFrosting] = useState("");
  const [selectedDecorations, setSelectedDecorations] = useState<string[]>([]);
  const [cakeMessage, setCakeMessage] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [referenceImageFile, setReferenceImageFile] = useState<File | null>(null);
  const [referenceImagePreview, setReferenceImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    return () => {
      if (referenceImagePreview) {
        URL.revokeObjectURL(referenceImagePreview);
      }
    };
  }, [referenceImagePreview]);

  const selectedCake = cakes.find((cake) => cake.id === selectedCakeId);

  const availableVariants =
    selectedCake?.product_variants.filter(
      (variant) => variant.is_available && variant.stockQuantity > 0
    ) ?? [];

  const selectedVariant = availableVariants.find(
    (variant) => variant.id === selectedVariantId
  );

  const cakeOptions = options.filter((option) =>
    ["flavor", "frosting", "decoration"].includes(option.option_type)
  );

  const flavors = cakeOptions.filter(
    (option) => option.option_type === "flavor"
  );

  const frostings = cakeOptions.filter(
    (option) => option.option_type === "frosting"
  );

  const decorations = cakeOptions.filter(
    (option) => option.option_type === "decoration"
  );

  const selectedOptions = useMemo(
    () =>
      cakeOptions.filter(
        (option) =>
          option.id === selectedFlavor ||
          option.id === selectedFrosting ||
          selectedDecorations.includes(option.id)
      ),
    [
      cakeOptions,
      selectedFlavor,
      selectedFrosting,
      selectedDecorations,
    ]
  );

  const total = useMemo(() => {
    const basePrice = selectedVariant?.price ?? 0;
    const optionPrice = selectedOptions.reduce(
      (sum, option) => sum + option.additional_price,
      0
    );

    return basePrice + optionPrice;
  }, [selectedVariant, selectedOptions]);

  const toggleDecoration = (id: string) => {
    setSelectedDecorations((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  const handleReferenceImageChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Your image must be 5 MB or smaller.");
      return;
    }

    setReferenceImageFile(file);
    setReferenceImagePreview(URL.createObjectURL(file));
    toast.success("Reference image selected!");
  };

  const removeReferenceImage = () => {
    setReferenceImageFile(null);
    setReferenceImagePreview(null);
  };

  const chooseCake = (id: string) => {
    setSelectedCakeId(id);
    setSelectedVariantId("");
    setSelectedFlavor("");
    setSelectedFrosting("");
    setSelectedDecorations([]);
  };

  const canContinue = () => {
    if (step === 1) {
      if (!selectedCakeId || !selectedVariantId) {
        toast.error("Please choose a cake and size first.");
        return false;
      }
    }

    if (step === 2) {
      if (!selectedFlavor || !selectedFrosting) {
        toast.error("Please select a flavor and frosting.");
        return false;
      }
    }

    return true;
  };

  const handleContinue = () => {
    if (!canContinue()) return;
    setStep((current) => Math.min(current + 1, 3));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAddToCart = async (destination: "/cart" | "/checkout" = "/cart") => {
    if (!selectedCake || !selectedVariant || isUploading) return;

    setIsUploading(true);

    try {
      let referenceImagePath: string | null = null;

      if (referenceImageFile) {
        const supabase = createClient();
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          toast.error("Please sign in before uploading a reference image.");
          return;
        }

        const safeFileName = referenceImageFile.name.replace(
          /[^a-zA-Z0-9._-]/g,
          "-"
        );

        const filePath = `${user.id}/${crypto.randomUUID()}-${safeFileName}`;

        const { data, error } = await supabase.storage
          .from("custom-cake-references")
          .upload(filePath, referenceImageFile, {
            cacheControl: "3600",
            upsert: false,
            contentType: referenceImageFile.type,
          });

        if (error) throw error;

        referenceImagePath = data.path;
      }

      addItem({
        id: `custom-${crypto.randomUUID()}`,
        productId: selectedCake.id,
        variantId: selectedVariant.id,
        name: selectedCake.name,
        variantName: selectedVariant.name,
        price: total,
        image: selectedCake.image_url,
        quantity: 1,
        stockQuantity: selectedVariant.stockQuantity,
        customCake: {
          options: selectedOptions.map((option) => ({
            id: option.id,
            name: option.name,
            type: option.option_type,
            additionalPrice: option.additional_price,
          })),
          cakeMessage: cakeMessage.trim(),
          specialInstructions: specialInstructions.trim(),
          referenceImagePath,
        },
      });

      toast.success("Your custom cake has been added to your cart!");
      router.push(destination);
    } catch (error) {
      console.error("Custom cake image upload failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to add your custom cake. Please try again."
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fffaf5]">
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-10">
        <div className="mb-10 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-[#a86f52]">
            Made Especially for You
          </p>
          <h1 className="mt-3 font-serif text-4xl text-[#3d3029] md:text-5xl">
            Design Your Dream Cake
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#8b7b70]">
            A little sweetness, a little creativity, and a cake made
            just the way you imagined.
          </p>
        </div>

        <div className="mx-auto mb-12 grid max-w-3xl grid-cols-3">
          {steps.map((item, index) => {
            const active = step === index + 1;
            const completed = step > index + 1;

            return (
              <div key={item.number} className="relative text-center">
                <div className="flex items-center">
                  {index > 0 && (
                    <div
                      className={`h-px flex-1 ${
                        completed || active
                          ? "bg-[#a86f52]"
                          : "bg-[#eadfd5]"
                      }`}
                    />
                  )}

                  <div
                    className={`mx-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                      active || completed
                        ? "border-[#a86f52] bg-[#a86f52] text-white"
                        : "border-[#eadfd5] bg-white text-[#8b7b70]"
                    }`}
                  >
                    {completed ? <Check size={16} /> : item.number}
                  </div>

                  {index < 2 && (
                    <div
                      className={`h-px flex-1 ${
                        completed ? "bg-[#a86f52]" : "bg-[#eadfd5]"
                      }`}
                    />
                  )}
                </div>

                <p
                  className={`mt-3 text-xs ${
                    active
                      ? "font-semibold text-[#7a5443]"
                      : "text-[#8b7b70]"
                  }`}
                >
                  {item.title}
                </p>
              </div>
            );
          })}
        </div>

        <div className="grid items-start gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="lg:sticky lg:top-8">
            <div className="overflow-hidden border border-[#eadfd5] bg-white">
              <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-[#f3e5d8]">
                {selectedCake?.image_url ? (
                  <img
                    src={selectedCake.image_url}
                    alt={selectedCake.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="text-center text-[#a86f52]">
                    <CakeSlice size={64} strokeWidth={1} className="mx-auto" />
                    <p className="mt-3 font-serif text-lg">
                      Your cake preview
                    </p>
                  </div>
                )}

                <div className="absolute left-4 top-4 rounded-full bg-white/90 px-4 py-2 text-[10px] uppercase tracking-widest text-[#7a5443]">
                  Your creation
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#a86f52]">
                      Custom cake preview
                    </p>
                    <h2 className="mt-2 font-serif text-2xl text-[#3d3029]">
                      {selectedCake?.name ?? "Choose your cake"}
                    </h2>
                    <p className="mt-1 text-xs text-[#8b7b70]">
                      {selectedVariant?.name ?? "Select a cake size"}
                    </p>
                  </div>
                  <Heart size={20} className="text-[#a86f52]" />
                </div>

                <div className="my-5 border-t border-[#eadfd5]" />

                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#8b7b70]">
                    Estimated total
                  </span>
                  <span className="font-serif text-2xl text-[#a86f52]">
                    {formatPrice(total)}
                  </span>
                </div>

                <p className="mt-3 text-[11px] leading-5 text-[#8b7b70]">
                  Final pricing and availability will be validated when
                  your order is placed.
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-start gap-3 border border-[#eadfd5] bg-white p-4">
              <Sparkles
                size={18}
                className="mt-0.5 shrink-0 text-[#a86f52]"
              />
              <p className="text-xs leading-6 text-[#8b7b70]">
                Every custom cake is prepared with care by our bakery.
                Let your celebration have something sweet and personal.
              </p>
            </div>
          </aside>

          <section className="border border-[#eadfd5] bg-white p-6 md:p-9">
            {step === 1 && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-[#a86f52]">
                  Step 01 / Cake Basics
                </p>
                <h2 className="mt-3 font-serif text-3xl text-[#3d3029]">
                  Start with the basics
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#8b7b70]">
                  Choose the cake that will be the heart of your
                  celebration.
                </p>

                <div className="mt-8">
                  <h3 className="mb-4 text-sm font-semibold text-[#3d3029]">
                    Choose your cake
                  </h3>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {cakes.map((cake) => {
                      const active = selectedCakeId === cake.id;

                      return (
                        <button
                          key={cake.id}
                          type="button"
                          onClick={() => chooseCake(cake.id)}
                          className={`border p-4 text-left transition ${
                            active
                              ? "border-[#a86f52] bg-[#fffaf5] ring-1 ring-[#a86f52]"
                              : "border-[#eadfd5] hover:border-[#c59a7f]"
                          }`}
                        >
                          <CakeSlice
                            size={22}
                            className="mb-3 text-[#a86f52]"
                          />
                          <p className="font-serif text-sm text-[#3d3029]">
                            {cake.name}
                          </p>
                          <p className="mt-2 text-[10px] text-[#8b7b70]">
                            From {formatPrice(cake.base_price)}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-9">
                  <h3 className="mb-4 text-sm font-semibold text-[#3d3029]">
                    Choose your size
                  </h3>

                  {availableVariants.length === 0 ? (
                    <p className="rounded-lg bg-[#fff5f2] p-4 text-sm text-red-600">
                      No sizes are currently available for this cake.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {availableVariants.map((variant) => {
                        const active = selectedVariantId === variant.id;

                        return (
                          <button
                            key={variant.id}
                            type="button"
                            onClick={() => setSelectedVariantId(variant.id)}
                            className={`flex w-full items-center justify-between border p-4 text-left transition ${
                              active
                                ? "border-[#a86f52] bg-[#fffaf5]"
                                : "border-[#eadfd5] hover:border-[#c59a7f]"
                            }`}
                          >
                            <div>
                              <p className="text-sm font-medium text-[#3d3029]">
                                {variant.name}
                              </p>
                              <p className="mt-1 text-xs text-[#8b7b70]">
                                {variant.stockQuantity} available
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-[#7a5443]">
                                {formatPrice(variant.price)}
                              </span>
                              <span
                                className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                                  active
                                    ? "border-[#a86f52] bg-[#a86f52] text-white"
                                    : "border-[#d8c8bb]"
                                }`}
                              >
                                {active && <Check size={12} />}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-[#a86f52]">
                  Step 02 / Make It Yours
                </p>
                <h2 className="mt-3 font-serif text-3xl text-[#3d3029]">
                  Add your personal touch
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#8b7b70]">
                  Pick the flavors and details that make your cake
                  uniquely yours.
                </p>

                <div className="mt-8">
                  <h3 className="mb-4 text-sm font-semibold text-[#3d3029]">
                    1. Choose a flavor
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {flavors.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSelectedFlavor(option.id)}
                        className={`border p-4 text-sm transition ${
                          selectedFlavor === option.id
                            ? "border-[#a86f52] bg-[#fffaf5] text-[#7a5443]"
                            : "border-[#eadfd5] text-[#8b7b70] hover:border-[#c59a7f]"
                        }`}
                      >
                        {option.name}
                        {option.additional_price > 0 && (
                          <span className="mt-1 block text-xs">
                            +{formatPrice(option.additional_price)}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="mb-4 text-sm font-semibold text-[#3d3029]">
                    2. Choose your frosting
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {frostings.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSelectedFrosting(option.id)}
                        className={`border p-4 text-sm transition ${
                          selectedFrosting === option.id
                            ? "border-[#a86f52] bg-[#fffaf5] text-[#7a5443]"
                            : "border-[#eadfd5] text-[#8b7b70] hover:border-[#c59a7f]"
                        }`}
                      >
                        {option.name}
                        {option.additional_price > 0 && (
                          <span className="mt-1 block text-xs">
                            +{formatPrice(option.additional_price)}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="mb-2 text-sm font-semibold text-[#3d3029]">
                    3. Choose decorations
                  </h3>
                  <p className="mb-4 text-xs text-[#8b7b70]">
                    Select as many as you like.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {decorations.map((option) => {
                      const active = selectedDecorations.includes(option.id);

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => toggleDecoration(option.id)}
                          className={`flex items-center justify-between border p-4 text-sm transition ${
                            active
                              ? "border-[#a86f52] bg-[#fffaf5] text-[#7a5443]"
                              : "border-[#eadfd5] text-[#8b7b70] hover:border-[#c59a7f]"
                          }`}
                        >
                          {option.name}
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded border ${
                              active
                                ? "border-[#a86f52] bg-[#a86f52] text-white"
                                : "border-[#d8c8bb]"
                            }`}
                          >
                            {active && <Check size={12} />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-8">
                  <label
                    htmlFor="cake-message"
                    className="mb-3 block text-sm font-semibold text-[#3d3029]"
                  >
                    4. Your cake message
                  </label>
                  <input
                    id="cake-message"
                    value={cakeMessage}
                    onChange={(event) => setCakeMessage(event.target.value)}
                    maxLength={50}
                    placeholder="e.g. Happy Birthday, Sarah!"
                    className="w-full border border-[#eadfd5] bg-[#fffaf5] px-4 py-3 text-sm text-[#3d3029] outline-none transition focus:border-[#a86f52]"
                  />
                  <p className="mt-2 text-right text-[10px] text-[#8b7b70]">
                    {cakeMessage.length}/50 characters
                  </p>
                </div>

                <div className="mt-6">
                  <label
                    htmlFor="special-instructions"
                    className="mb-3 block text-sm font-semibold text-[#3d3029]"
                  >
                    Special instructions
                  </label>
                  <textarea
                    id="special-instructions"
                    value={specialInstructions}
                    onChange={(event) =>
                      setSpecialInstructions(event.target.value)
                    }
                    maxLength={500}
                    rows={4}
                    placeholder="Tell us more about your cake design..."
                    className="w-full resize-y border border-[#eadfd5] bg-[#fffaf5] px-4 py-3 text-sm text-[#3d3029] outline-none transition focus:border-[#a86f52]"
                  />
                  <p className="mt-2 text-right text-[10px] text-[#8b7b70]">
                    {specialInstructions.length}/500 characters
                  </p>
                </div>

                <div className="mt-8">
                  <h3 className="mb-2 text-sm font-semibold text-[#3d3029]">
                    5. Reference image (optional)
                  </h3>
                  <p className="mb-4 text-xs leading-6 text-[#8b7b70]">
                    Have an inspiration photo? Upload it so our bakery can
                    better understand your desired cake design.
                  </p>

                  {referenceImagePreview ? (
                    <div className="relative overflow-hidden rounded-lg border border-[#eadfd5] bg-[#fffaf5] p-3">
                      <img
                        src={referenceImagePreview}
                        alt="Custom cake reference preview"
                        className="max-h-64 w-full rounded-md object-contain"
                      />
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="truncate text-xs text-[#7a5443]">
                          {referenceImageFile?.name}
                        </p>
                        <button
                          type="button"
                          onClick={removeReferenceImage}
                          className="inline-flex shrink-0 items-center gap-1 text-xs text-red-600 hover:text-red-700"
                        >
                          <X size={14} />
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#d8c8bb] bg-[#fffaf5] px-5 py-10 text-center transition hover:border-[#a86f52]">
                      <ImagePlus size={30} className="mb-3 text-[#a86f52]" />
                      <span className="text-sm font-medium text-[#7a5443]">
                        Click to upload an image
                      </span>
                      <span className="mt-2 text-xs text-[#8b7b70]">
                        JPG, PNG, or WebP · Maximum 5 MB
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleReferenceImageChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-[#a86f52]">
                  Step 03 / Review
                </p>
                <h2 className="mt-3 font-serif text-3xl text-[#3d3029]">
                  Your cake, your way
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#8b7b70]">
                  Take a final look at your custom cake before adding it
                  to your shopping cart.
                </p>

                <div className="mt-8 space-y-5">
                  <div className="flex justify-between border-b border-[#eadfd5] pb-4">
                    <div>
                      <p className="text-xs text-[#8b7b70]">Cake</p>
                      <p className="mt-1 font-medium text-[#3d3029]">
                        {selectedCake?.name}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-xs text-[#a86f52] underline"
                    >
                      Edit
                    </button>
                  </div>

                  <div className="flex justify-between border-b border-[#eadfd5] pb-4">
                    <div>
                      <p className="text-xs text-[#8b7b70]">Size</p>
                      <p className="mt-1 font-medium text-[#3d3029]">
                        {selectedVariant?.name}
                      </p>
                    </div>
                    <span className="text-sm text-[#7a5443]">
                      {formatPrice(selectedVariant?.price ?? 0)}
                    </span>
                  </div>

                  <div className="border-b border-[#eadfd5] pb-4">
                    <div className="mb-3 flex justify-between">
                      <p className="text-xs text-[#8b7b70]">
                        Customizations
                      </p>
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="text-xs text-[#a86f52] underline"
                      >
                        Edit
                      </button>
                    </div>

                    <div className="space-y-3">
                      {selectedOptions.map((option) => (
                        <div
                          key={option.id}
                          className="flex justify-between gap-3 text-sm"
                        >
                          <span className="text-[#3d3029]">
                            {option.name}
                          </span>
                          <span className="text-[#8b7b70]">
                            {option.additional_price > 0
                              ? formatPrice(option.additional_price)
                              : "Included"}
                          </span>
                        </div>
                      ))}
                    </div>

                    {cakeMessage && (
                      <p className="mt-4 text-sm text-[#3d3029]">
                        <span className="text-[#8b7b70]">Cake message:</span>{" "}
                        {cakeMessage}
                      </p>
                    )}

                    {specialInstructions && (
                      <p className="mt-3 text-sm leading-6 text-[#3d3029]">
                        <span className="text-[#8b7b70]">
                          Special instructions:
                        </span>{" "}
                        {specialInstructions}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="font-medium text-[#3d3029]">
                      Estimated total
                    </span>
                    <span className="font-serif text-2xl text-[#a86f52]">
                      {formatPrice(total)}
                    </span>
                  </div>

                  <div className="rounded-lg bg-[#f8f1e9] p-4 text-xs leading-6 text-[#7a5443]">
                    Your cake will be added to your existing BakeCart
                    shopping cart. You'll choose your pickup or delivery
                    schedule during checkout.
                  </div>
                </div>
              </div>
            )}

            <div className="mt-10 flex items-center justify-between gap-4 border-t border-[#eadfd5] pt-6">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((current) => current - 1)}
                  className="inline-flex items-center gap-2 px-2 py-3 text-sm text-[#8b7b70] transition hover:text-[#a86f52]"
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push("/products")}
                  className="inline-flex items-center gap-2 px-2 py-3 text-sm text-[#8b7b70] transition hover:text-[#a86f52]"
                >
                  <ArrowLeft size={16} />
                  Back to menu
                </button>
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleContinue}
                  className="inline-flex items-center gap-3 bg-[#a86f52] px-7 py-4 text-sm font-medium text-white transition hover:bg-[#8f5b42]"
                >
                  Continue
                  <ArrowRight size={16} />
                </button>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => handleAddToCart("/cart")}
                  disabled={isUploading}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-[#a86f52] bg-white px-7 py-4 text-sm font-semibold text-[#a86f52] transition hover:bg-[#f8f1e9] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <ShoppingBag size={16} />
                      Add to Cart
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleAddToCart("/checkout")}
                  disabled={isUploading}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[#a86f52] px-7 py-4 text-sm font-semibold text-white transition hover:bg-[#8f5b42] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      Buy Now
                      <ChevronRight size={16} />
                    </>
                  )}
                </button>
              </div>
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
