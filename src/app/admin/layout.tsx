
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import AdminNav from "./admin-nav";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-[#f8f5f1]">
      <header className="border-b border-border bg-white px-6 py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/admin" className="text-2xl font-bold text-primary">
            BakeCart Admin
          </Link>

          <div className="flex items-center gap-5">
            <Link
              href="/"
              className="text-sm font-medium text-muted hover:text-primary"
            >
              View Storefront →
            </Link>

            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="text-sm font-medium text-[#a05243] hover:underline"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 md:flex-row">
        <aside className="w-full shrink-0 rounded-2xl border border-border bg-white p-5 md:w-60">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted">
            Administration
          </p>

          <AdminNav />
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
