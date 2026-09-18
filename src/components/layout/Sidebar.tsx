"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type NavItem = {
  label: string;
  href: string;
  icon: string;
  children?: { label: string; href: string }[];
};

const NAV: NavItem[] = [
  { label: "แดชบอร์ด", href: "/dashboard", icon: "📊" },
  {
    label: "Front Desk",
    href: "/front-desk",
    icon: "🏨",
    children: [
      { label: "Room Board", href: "/front-desk/rooms" },
      { label: "เช็คอิน", href: "/front-desk/check-in" },
      { label: "เช็คเอาท์", href: "/front-desk/check-out" },
    ],
  },
  { label: "การจอง", href: "/bookings", icon: "📅" },
  { label: "แขก", href: "/guests", icon: "👤" },
  {
    label: "การชำระเงิน",
    href: "/payments",
    icon: "💰",
    children: [
      { label: "การชำระเงิน", href: "/payments" },
      { label: "เงินมัดจำ", href: "/deposits" },
      { label: "เงินค้างเก็บ", href: "/receivables" },
    ],
  },
  {
    label: "เอกสาร",
    href: "/documents",
    icon: "📄",
    children: [
      { label: "กล่องขาเข้า", href: "/documents/inbox" },
      { label: "ตรวจสอบแล้ว", href: "/documents/verified" },
      { label: "ปฏิเสธ", href: "/documents/rejected" },
    ],
  },
  {
    label: "บัญชี",
    href: "/accounting",
    icon: "📒",
    children: [
      { label: "รายได้", href: "/accounting/revenue" },
      { label: "ค่าใช้จ่าย", href: "/accounting/expenses" },
      { label: "การปรับปรุง", href: "/accounting/adjustments" },
    ],
  },
  { label: "ทะเบียน รร.3/4", href: "/registration", icon: "📋" },
  { label: "แม่บ้าน", href: "/housekeeping", icon: "🧹" },
  { label: "ซ่อมบำรุง", href: "/maintenance", icon: "🔧" },
  { label: "รายงาน", href: "/reports", icon: "📈" },
  {
    label: "ตั้งค่าระบบ",
    href: "/admin",
    icon: "⚙️",
    children: [
      { label: "ผู้ใช้งาน", href: "/admin/users" },
      { label: "ห้องพัก", href: "/admin/rooms" },
      { label: "Integration", href: "/admin/integrations" },
      { label: "Audit Log", href: "/admin/audit" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
            V
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">Viphuanan</div>
            <div className="text-xs text-gray-500">Resort</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {NAV.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <div key={item.href} className="mb-0.5">
              <Link
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </Link>

              {item.children && isActive && (
                <div className="ml-4 mt-0.5 space-y-0.5">
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={`block px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        pathname === child.href
                          ? "text-blue-700 font-medium"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-2 py-3 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <span>🚪</span>
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </aside>
  );
}
