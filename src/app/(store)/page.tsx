
import Link from "next/link";
import {
  ArrowRight,
  CakeSlice,
  Croissant,
  Cookie,
  Heart,
  Sparkles,
} from "lucide-react";

const categories = [
  {
    name: "Fresh Bread",
    description: "Soft, warm, and freshly baked.",
    icon: Croissant,
    image:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff",
  },
  {
    name: "Cakes",
    description: "Beautiful cakes for every occasion.",
    icon: CakeSlice,
    image:
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587",
  },
  {
    name: "Pastries",
    description: "Little treats worth slowing down for.",
    icon: Croissant,
    image:
      "https://images.unsplash.com/photo-1555507036-ab1f4038808a",
  },
  {
    name: "Cookies",
    description: "Sweet, comforting little bites.",
    icon: Cookie,
    image:
      "https://images.unsplash.com/photo-1499636136210-6f4ee915583e",
  },
];

export default function HomePage() {
  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 md:grid-cols-2 md:py-24">
        <div className="max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#eadfd5] px-4 py-2 text-xs font-medium tracking-wider text-[#7a5443]">
            <Sparkles size={14} />
            MADE FRESH, MADE WITH LOVE
          </div>

          <h1 className="font-serif text-5xl leading-[1.15] tracking-tight text-[#3d3029] md:text-7xl">
            Made slowly.
            <br />
            <span className="italic text-[#a86f52]">
              Enjoyed fully.
            </span>
          </h1>

          <p className="mt-7 max-w-md text-base leading-8 text-[#8b7b70]">
            Discover freshly baked treats and beautifully crafted
            cakes made to bring a little more sweetness to your day.
          </p>

          <div className="mt-9 flex flex-wrap gap-4">
            <Link
              href="/products"
              className="inline-flex items-center gap-3 bg-[#7a5443] px-7 py-4 text-sm font-medium text-white transition hover:bg-[#624333]"
            >
              Explore the Menu
              <ArrowRight size={17} />
            </Link>

            <Link
              href="/custom-cake"
              className="inline-flex items-center gap-2 border border-[#cbb5a5] px-7 py-4 text-sm font-medium text-[#7a5443] transition hover:bg-[#f3e5d8]"
            >
              Custom Cakes
            </Link>
          </div>

          <div className="mt-12 flex items-center gap-3 text-sm text-[#8b7b70]">
            <Heart size={17} className="text-[#a86f52]" />
            <span>Thoughtfully made for your sweetest moments.</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-lg">
          <div className="absolute -right-5 -top-5 h-32 w-32 rounded-full bg-[#f3e5d8]" />

          <div className="relative h-[430px] overflow-hidden rounded-t-[48%] rounded-b-sm bg-[#eadfd5] md:h-[540px]">
            <img
              src="https://images.unsplash.com/photo-1509440159596-0249088772ff"
              alt="Freshly baked artisan bread"
              className="h-full w-full object-cover"
            />
          </div>

          <div className="absolute -bottom-6 -left-5 max-w-[220px] border border-[#eadfd5] bg-[#fffaf5] p-5 shadow-lg">
            <p className="font-serif text-xl italic text-[#7a5443]">
              Baked with care.
            </p>
            <p className="mt-2 text-xs leading-5 text-[#8b7b70]">
              A little sweetness makes every day better.
            </p>
          </div>

          <div className="absolute right-4 top-8 flex h-20 w-20 rotate-12 items-center justify-center rounded-full bg-[#7a5443] text-center text-[10px] font-medium uppercase leading-4 tracking-widest text-white">
            Fresh
            <br />
            Every
            <br />
            Day
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="bg-[#f8f1e9] px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-[#a86f52]">
              Something for everyone
            </p>
            <h2 className="mt-4 font-serif text-4xl text-[#3d3029] md:text-5xl">
              Explore our bakery
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-[#8b7b70]">
              From everyday favorites to special celebrations,
              find something delicious to enjoy.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => {
              const Icon = category.icon;

              return (
                <Link
                  key={category.name}
                  href="/products"
                  className="group overflow-hidden bg-[#fffaf5]"
                >
                  <div className="h-64 overflow-hidden bg-[#eadfd5]">
                    <img
                      src={category.image}
                      alt={category.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  </div>

                  <div className="flex items-center justify-between p-5">
                    <div>
                      <h3 className="font-serif text-xl text-[#3d3029]">
                        {category.name}
                      </h3>
                      <p className="mt-2 text-xs text-[#8b7b70]">
                        {category.description}
                      </p>
                    </div>

                    <Icon
                      size={21}
                      className="shrink-0 text-[#a86f52]"
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Custom Cake Banner */}
      <section className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="grid overflow-hidden bg-[#eadfd5] md:grid-cols-2">
          <div className="flex flex-col justify-center p-9 md:p-16">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#a86f52]">
              Made just for you
            </p>

            <h2 className="mt-5 font-serif text-4xl leading-tight text-[#3d3029] md:text-5xl">
              A cake as special as your celebration.
            </h2>

            <p className="mt-5 max-w-md text-sm leading-7 text-[#79675b]">
              Choose your cake flavor, size, design, and special
              details. Let us help make your celebration sweeter.
            </p>

            <Link
              href="/custom-cake"
              className="mt-8 inline-flex w-fit items-center gap-3 bg-[#7a5443] px-7 py-4 text-sm font-medium text-white transition hover:bg-[#624333]"
            >
              Create Your Cake
              <ArrowRight size={17} />
            </Link>
          </div>

          <div className="min-h-[320px] bg-[#d9c4b3]">
            <img
              src="https://images.unsplash.com/photo-1565958011703-44f9829ba187"
              alt="Beautiful cake for a special celebration"
              className="h-full min-h-[320px] w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-[#f8f1e9] px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-[#a86f52]">
              Simple and sweet
            </p>
            <h2 className="mt-4 font-serif text-4xl text-[#3d3029] md:text-5xl">
              How it works
            </h2>
          </div>

          <div className="mt-14 grid gap-10 md:grid-cols-3">
            <div className="text-center">
              <span className="font-serif text-4xl italic text-[#a86f52]">
                01
              </span>
              <h3 className="mt-4 font-serif text-2xl text-[#3d3029]">
                Browse
              </h3>
              <p className="mx-auto mt-3 max-w-xs text-sm leading-7 text-[#8b7b70]">
                Explore our selection of freshly baked treats and cakes.
              </p>
            </div>

            <div className="text-center">
              <span className="font-serif text-4xl italic text-[#a86f52]">
                02
              </span>
              <h3 className="mt-4 font-serif text-2xl text-[#3d3029]">
                Customize
              </h3>
              <p className="mx-auto mt-3 max-w-xs text-sm leading-7 text-[#8b7b70]">
                Choose your favorites or create a cake for your occasion.
              </p>
            </div>

            <div className="text-center">
              <span className="font-serif text-4xl italic text-[#a86f52]">
                03
              </span>
              <h3 className="mt-4 font-serif text-2xl text-[#3d3029]">
                Enjoy
              </h3>
              <p className="mx-auto mt-3 max-w-xs text-sm leading-7 text-[#8b7b70]">
                Place your order and enjoy something made with love.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="px-6 py-20 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-[#a86f52]">
          Your next favorite treat awaits
        </p>

        <h2 className="mx-auto mt-4 max-w-2xl font-serif text-4xl leading-tight text-[#3d3029] md:text-5xl">
          Make room for something sweet.
        </h2>

        <Link
          href="/products"
          className="mt-8 inline-flex items-center gap-3 bg-[#7a5443] px-8 py-4 text-sm font-medium text-white transition hover:bg-[#624333]"
        >
          Browse the Menu
          <ArrowRight size={17} />
        </Link>
      </section>
    </div>
  );
}
