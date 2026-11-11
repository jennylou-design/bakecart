
import Link from "next/link";

export default function HomePage() {
  return (
    <div>
      <section className="mx-auto grid min-h-[600px] max-w-7xl items-center gap-12 px-6 py-20 md:grid-cols-2">
        <div>
          <p className="mb-4 font-medium uppercase tracking-[0.2em] text-primary">
            Freshly baked, lovingly made
          </p>

          <h1 className="text-5xl font-bold leading-tight md:text-6xl">
            Every bite tells a sweeter story.
          </h1>

          <p className="mt-6 max-w-lg leading-8 text-muted">
            Discover delicious baked treats and beautifully crafted cakes
            made for your special moments.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/products"
              className="rounded-full bg-primary px-8 py-3 font-medium text-white transition hover:opacity-90"
            >
              Explore Products
            </Link>

            <Link
              href="/custom-cake"
              className="rounded-full border border-primary px-8 py-3 font-medium text-primary transition hover:bg-secondary"
            >
              Customize a Cake
            </Link>
          </div>
        </div>

        <div className="flex min-h-[350px] items-center justify-center rounded-3xl bg-secondary p-10 text-center">
          <div>
            <p className="text-7xl">🎂</p>
            <p className="mt-5 text-xl font-semibold text-primary">
              Baked with love
            </p>
            <p className="mt-2 text-sm text-muted">
              Sweet moments start here.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
