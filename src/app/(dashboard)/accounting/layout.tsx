import Link from "next/link";
import { db } from "@/lib/db";

export default async function AccountingLayout({ children }: { children: React.ReactNode }) {
  const pendingJournals = await db.journalEntry.count({
    where: { status: { in: ["PENDING_REVIEW", "VERIFIED", "APPROVED"] } },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">บัญชี</h1>
        <div className="flex gap-2">
          <Link
            href="/accounting/entries/new"
            className="text-sm bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + รายการบัญชี
          </Link>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200 mb-6">
        <TabLink href="/accounting/revenue" label="รายได้" />
        <TabLink href="/accounting/expenses" label="ค่าใช้จ่าย" />
        <TabLink href="/accounting/adjustments" label="รายการปรับปรุง" count={pendingJournals} />
      </div>

      {children}
    </div>
  );
}

function TabLink({ href, label, count }: { href: string; label: string; count?: number }) {
  return (
    <Link
      href={href}
      className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-900 -mb-px transition-colors flex items-center gap-2"
    >
      {label}
      {count != null && count > 0 && (
        <span className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full font-medium">
          {count}
        </span>
      )}
    </Link>
  );
}
