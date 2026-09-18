import Link from "next/link";

const TABS = [
  { label: "ผู้ใช้งาน", href: "/admin/users" },
  { label: "ห้องพัก", href: "/admin/rooms" },
  { label: "Audit Log", href: "/admin/audit" },
  { label: "ตั้งค่าระบบ", href: "/admin" },
  { label: "Integration", href: "/admin/integrations" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">ตั้งค่าระบบ</h1>
        <p className="text-sm text-gray-500 mt-0.5">จัดการผู้ใช้งาน ห้องพัก และการตั้งค่าของระบบ</p>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="px-4 py-2 text-sm font-medium border-b-2 transition-colors border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
          >
            {t.label}
          </Link>
        ))}
      </div>

      {children}
    </div>
  );
}
