
import Link from "next/link";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#faf7f2] px-5 py-12">
      <Link
        href="/"
        className="mb-8 text-3xl font-bold tracking-tight text-[#7a5443]"
      >
        BakeCart.
      </Link>

      <div className="w-full max-w-md">
        {children}
      </div>

      <Link
        href="/"
        className="mt-8 text-sm text-[#8b7b70] hover:text-[#7a5443]"
      >
        ← Back to Store
      </Link>
    </main>
  );
}
