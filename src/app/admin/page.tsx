
import Link from "next/link";

const dashboardItems = [
  {
    title: "Products",
    description: "Manage bakery products and categories.",
    href: "/admin/products",
    icon: "🧁",
  },
  {
    title: "Orders",
    description: "View and manage customer orders.",
    href: "/admin/orders",
    icon: "📦",
  },
  {
    title: "Inventory",
    description: "Monitor stock and inventory records.",
    href: "/admin/inventory",
    icon: "📋",
  },
  {
    title: "Reports",
    description: "Review sales and business performance.",
    href: "/admin/reports",
    icon: "📊",
  },
];

export default function AdminDashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <p className="text-sm font-medium text-primary">BAKECART MANAGEMENT</p>
        <h1 className="mt-2 text-3xl font-bold">Dashboard</h1>
        <p className="mt-2 text-muted">
          Welcome to your bakery management workspace.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {dashboardItems.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="rounded-2xl border border-border bg-white p-6 transition hover:-translate-y-1 hover:shadow-md"
          >
            <span className="text-3xl">{item.icon}</span>
            <h2 className="mt-5 text-xl font-semibold">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {item.description}
            </p>
            <p className="mt-5 text-sm font-semibold text-primary">
              Manage →
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
