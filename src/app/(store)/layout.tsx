import Link from "next/link";
import NotificationBell from "@/components/store/notification-bell";

const navigation = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/products" },
  { label: "My Orders", href: "/orders" },
  { label: "Custom Cakes", href: "/custom-cake" },
  { label: "Our Story", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export default function StoreLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {/* Announcement Bar */}
      <div className="bg-[#7a5443] px-4 py-2 text-center text-xs tracking-[0.15em] text-white">
        OPEN 24 HOURS · 7 DAYS A WEEK — FRESHLY BAKED, MADE WITH LOVE
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[#eadfd5] bg-[#fffaf5]/95 backdrop-blur-md">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center bg-[#7a5443] font-serif text-xl text-white">
              B
            </span>
            <span className="font-serif text-2xl font-semibold tracking-tight text-[#3d3029]">
              BakeCart<span className="text-[#a86f52]">.</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden items-center gap-8 text-sm font-medium text-[#6f5b50] md:flex">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-[#a86f52]"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Account, Notifications and Cart */}
          <div className="flex items-center gap-4 text-sm">
            <Link
              href="/login"
              className="hidden text-[#6f5b50] transition-colors hover:text-[#a86f52] sm:block"
            >
              Sign In
            </Link>

            <NotificationBell />

            <Link
              href="/cart"
              className="font-medium text-[#7a5443] transition-colors hover:text-[#a86f52]"
            >
              Cart
            </Link>
          </div>
        </nav>
      </header>

      {/* Page Content */}
      <main className="min-h-screen">{children}</main>

      {/* Footer */}
      <footer className="bg-[#3d3029] px-6 py-14 text-[#fffaf5]">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-3">
          <div>
            <h2 className="font-serif text-2xl font-semibold">
              BakeCart.
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-7 text-[#d6c5b8]">
              Freshly baked treats and beautifully crafted cakes,
              made to bring sweetness to your everyday moments.
            </p>
          </div>

          <div>
            <h3 className="font-serif text-lg">Explore</h3>
            <div className="mt-4 flex flex-col gap-3 text-sm text-[#d6c5b8]">
              <Link href="/" className="hover:text-white">Home</Link>
              <Link href="/products" className="hover:text-white">Shop</Link>
              <Link href="/custom-cake" className="hover:text-white">Custom Cakes</Link>
            </div>
          </div>

          <div>
            <h3 className="font-serif text-lg">Your Account</h3>
            <div className="mt-4 flex flex-col gap-3 text-sm text-[#d6c5b8]">
              <Link href="/login" className="hover:text-white">Sign In</Link>
              <Link href="/register" className="hover:text-white">Create Account</Link>
              <Link href="/cart" className="hover:text-white">Shopping Cart</Link>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-7xl border-t border-white/15 pt-6 text-center text-xs text-[#bba99c]">
          © 2026 BakeCart. Made with love.
        </div>
      </footer>
    </>
  );
}
