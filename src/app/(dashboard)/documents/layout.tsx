import Link from "next/link";
import { db } from "@/lib/db";

export default async function DocumentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pending, verified, rejected] = await Promise.all([
    db.document.count({ where: { status: "PENDING_REVIEW" } }),
    db.document.count({ where: { status: "VERIFIED" } }),
    db.document.count({ where: { status: "REJECTED" } }),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">เอกสาร</h1>
        <Link
          href="/documents/inbox"
          className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + อัปโหลดเอกสาร
        </Link>
      </div>

      <div className="flex gap-1 border-b border-gray-200 mb-6">
        <TabLink href="/documents/inbox" label="กล่องขาเข้า" count={pending} />
        <TabLink href="/documents/verified" label="ยืนยันแล้ว" count={verified} />
        <TabLink href="/documents/rejected" label="ปฏิเสธ" count={rejected} />
      </div>

      {children}
    </div>
  );
}

function TabLink({
  href,
  label,
  count,
}: {
  href: string;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-900 hover:border-b-2 hover:border-gray-900 -mb-px transition-colors flex items-center gap-2"
    >
      {label}
      {count > 0 && (
        <span className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full font-medium">
          {count}
        </span>
      )}
    </Link>
  );
}
