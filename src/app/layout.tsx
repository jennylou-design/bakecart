
import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const instant = false;
export const metadata: Metadata = {
  title: "BakeCart | Freshly Made, Lovingly Delivered",
  description:
    "Order freshly baked treats and customized cakes with BakeCart.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
