
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { name: "Dashboard", href: "/admin" },
  { name: "Products", href: "/admin/products" },
  { name: "Orders", href: "/admin/orders" },
  { name: "Inventory", href: "/admin/inventory" },
  { name: "Schedules", href: "/admin/schedules" },
  { name: "Reports", href: "/admin/reports" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-3 text-sm">
      {links.map((link) => {
        const isActive =
          link.href === "/admin"
            ? pathname === "/admin"
            : pathname === link.href ||
              pathname.startsWith(`${link.href}/`);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-lg px-3 py-2 font-medium transition-colors ${
              isActive
                ? "bg-secondary text-primary"
                : "text-foreground hover:bg-secondary/50 hover:text-primary"
            }`}
          >
            {link.name}
          </Link>
        );
      })}
    </nav>
  );
}
