import Link from "next/link";

const TABS = [
  { label: "P&L รายเดือน", href: "/reports" },
  { label: "อัตราการเข้าพัก", href: "/reports/occupancy" },
  { label: "รายได้ตามแหล่ง", href: "/reports/revenue" },
];

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">รายงาน</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          ข้อมูลรายได้ ค่าใช้จ่าย และประสิทธิภาพห้องพัก
        </p>
      </div>

      {/* Tab nav */}
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
