import Link from "next/link";
import { db } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";

const STATUS_CLASS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  PENDING_REVIEW: "bg-yellow-100 text-yellow-700",
  VERIFIED: "bg-blue-100 text-blue-700",
  APPROVED: "bg-indigo-100 text-indigo-700",
  POSTED: "bg-green-100 text-green-700",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_REVIEW: "รอตรวจ",
  VERIFIED: "ตรวจแล้ว",
  APPROVED: "อนุมัติแล้ว",
  POSTED: "Post แล้ว",
};

const TYPE_LABEL: Record<string, string> = {
  REVENUE: "รายได้",
  EXPENSE: "ค่าใช้จ่าย",
  ADJUSTMENT: "ปรับปรุง",
  REVERSAL: "Reversal",
  CORRECTION: "แก้ไข",
  OTHER: "อื่นๆ",
};

export default async function AdjustmentsPage() {
  const entries = await db.journalEntry.findMany({
    include: {
      lines: true,
      booking: { select: { bookingReference: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const pending = entries.filter((e) =>
    ["PENDING_REVIEW", "VERIFIED", "APPROVED"].includes(e.status)
  );
  const posted = entries.filter((e) => e.status === "POSTED");
  const drafts = entries.filter((e) => e.status === "DRAFT");

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide">รออนุมัติ</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{pending.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Draft</div>
          <div className="text-2xl font-bold text-gray-700 mt-1">{drafts.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Posted แล้ว</div>
          <div className="text-2xl font-bold text-green-700 mt-1">{posted.length}</div>
        </div>
      </div>

      <div className="flex justify-end">
        <Link
          href="/accounting/entries/new"
          className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + สร้างรายการบัญชี
        </Link>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-12 text-gray-400">ยังไม่มีรายการบัญชี</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase font-medium">เลขที่</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase font-medium">วันที่</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase font-medium">ประเภท</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase font-medium">คำอธิบาย</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase font-medium">การจอง</th>
                <th className="text-right px-4 py-3 text-xs text-gray-500 uppercase font-medium">ยอด</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase font-medium">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {entries.map((e) => {
                const total = e.lines.reduce((s, l) => s + Number(l.amount), 0) / 2;
                return (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/accounting/entries/${e.id}`} className="text-blue-600 hover:underline font-mono text-xs">
                        {e.entryNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(e.entryDate)}</td>
                    <td className="px-4 py-3 text-gray-600">{TYPE_LABEL[e.type] ?? e.type}</td>
                    <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{e.description}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                      {e.booking?.bookingReference ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCurrency(total)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLASS[e.status]}`}>
                        {STATUS_LABEL[e.status]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
