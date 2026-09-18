import Link from "next/link";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { markOverdueRegistrations } from "@/app/actions/registration";

const TYPE_LABEL: Record<string, string> = {
  RR3: "รร.3 (ไทย)",
  RR4: "รร.4 (ต่างชาติ)",
  TM30: "ตม.30 (ต่างชาติ)",
};

const TYPE_CLASS: Record<string, string> = {
  RR3: "bg-blue-100 text-blue-700",
  RR4: "bg-purple-100 text-purple-700",
  TM30: "bg-orange-100 text-orange-700",
};

const STATUS_CLASS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  SUBMITTED: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "รอส่ง",
  SUBMITTED: "ส่งแล้ว",
  OVERDUE: "เกินกำหนด",
  CANCELLED: "ยกเลิก",
};

export default async function RegistrationPage(
  props: PageProps<"/registration">
) {
  const { tab } = await props.searchParams;
  const activeTab = (tab as string) ?? "pending";

  // Auto-mark overdue on every page view (no cron in MVP)
  await markOverdueRegistrations();

  const [pending, overdue, submitted, all] = await Promise.all([
    db.registrationRecord.count({ where: { status: "PENDING" } }),
    db.registrationRecord.count({ where: { status: "OVERDUE" } }),
    db.registrationRecord.count({ where: { status: "SUBMITTED" } }),
    db.registrationRecord.count(),
  ]);

  const whereClause =
    activeTab === "pending"
      ? { status: "PENDING" as const }
      : activeTab === "overdue"
      ? { status: "OVERDUE" as const }
      : activeTab === "submitted"
      ? { status: "SUBMITTED" as const }
      : {};

  const records = await db.registrationRecord.findMany({
    where: whereClause,
    orderBy: { dueAt: "asc" },
    take: 100,
    include: {
      booking: { select: { bookingReference: true } },
    },
  });

  const today = new Date().toLocaleDateString("th-TH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">ทะเบียนผู้พัก รร.3/4</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            รร.3 ต้องส่งภายในวันเช็คอิน — รร.4 และ ตม.30 ต้องส่งภายใน 24 ชั่วโมง
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/registration/print/rr3?date=${new Date().toISOString().slice(0, 10)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-4 py-2 rounded-lg transition-colors"
          >
            🖨 พิมพ์ รร.3
          </a>
          <a
            href={`/registration/print/rr4?date=${new Date().toISOString().slice(0, 10)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-4 py-2 rounded-lg transition-colors"
          >
            🖨 พิมพ์ รร.4
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide">รอส่ง</div>
          <div className="text-2xl font-bold text-yellow-600 mt-1">{pending}</div>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4">
          <div className="text-xs text-red-500 uppercase tracking-wide">เกินกำหนด</div>
          <div className="text-2xl font-bold text-red-600 mt-1">{overdue}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide">ส่งแล้ว</div>
          <div className="text-2xl font-bold text-green-700 mt-1">{submitted}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide">ทั้งหมด</div>
          <div className="text-2xl font-bold text-gray-700 mt-1">{all}</div>
        </div>
      </div>

      {/* Overdue warning */}
      {overdue > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
          ⚠️ มี <strong>{overdue} รายการ</strong> เกินกำหนดส่ง — กรุณาดำเนินการโดยด่วน
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { key: "pending", label: `รอส่ง (${pending})` },
          { key: "overdue", label: `เกินกำหนด (${overdue})` },
          { key: "submitted", label: `ส่งแล้ว (${submitted})` },
          { key: "all", label: `ทั้งหมด (${all})` },
        ].map(({ key, label }) => (
          <Link
            key={key}
            href={`/registration?tab=${key}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Table */}
      {records.length === 0 ? (
        <div className="text-center py-12 text-gray-400">ไม่มีรายการในหมวดนี้</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase font-medium">ชื่อแขก</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase font-medium">ประเภท</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase font-medium">ห้อง</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase font-medium">เช็คอิน</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase font-medium">ครบกำหนด</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase font-medium">การจอง</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase font-medium">สถานะ</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {records.map((r) => {
                const isOverdue = r.status === "OVERDUE";
                return (
                  <tr key={r.id} className={`hover:bg-gray-50 ${isOverdue ? "bg-red-50/30" : ""}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {r.guestName}
                      {r.nationality && (
                        <span className="text-xs text-gray-400 ml-1">({r.nationality})</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_CLASS[r.registrationType]}`}>
                        {TYPE_LABEL[r.registrationType]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-mono">{r.roomNumber}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {r.checkInDate.toLocaleDateString("th-TH")}
                    </td>
                    <td className={`px-4 py-3 text-xs font-medium ${isOverdue ? "text-red-600" : "text-gray-600"}`}>
                      {formatDateTime(r.dueAt)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                      {r.booking?.bookingReference ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLASS[r.status]}`}>
                        {STATUS_LABEL[r.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/registration/${r.id}`}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        ดูรายละเอียด →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Print hint */}
      <p className="text-xs text-gray-400 text-center">
        วันที่วันนี้: {today} — กดปุ่ม "พิมพ์ รร.3/4" เพื่อเปิดแบบฟอร์มสำหรับพิมพ์ส่งตำรวจ
      </p>
    </div>
  );
}
