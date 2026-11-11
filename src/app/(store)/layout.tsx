
  import Link from "next/link";

  export default function StoreLayout({
    children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
    return (
      <>
        <header className="border-b border-border bg-white">
          <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
            <Link href="/" className="text-2xl font-bold text-primary">
              BakeCart.
            </Link>

            <div className="flex items-center gap-6 text-sm">
              <Link href="/" className="hover:text-primary">
                Home
              </Link>
              <Link href="/products" className="hover:text-primary">
                Products
              </Link>
              <Link href="/custom-cake" className="hover:text-primary">
                Custom Cakes
              </Link>
              <Link href="/login" className="hover:text-primary">
                Sign In
              </Link>
            </div>
          </nav>
        </header>

        <main className="min-h-screen">{children}</main>

        <footer className="border-t border-border bg-white px-6 py-8 text-center text-sm text-muted">
          © 2026 BakeCart. Made with love.
        </footer>
      </>
    );
  }
