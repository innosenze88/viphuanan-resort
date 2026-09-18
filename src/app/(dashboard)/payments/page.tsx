import Link from "next/link";
import { db } from "@/lib/db";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default async function PaymentsPage() {
  const payments = await db.payment.findMany({
    include: { booking: { include: { guest: true, room: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const totalVerified = payments
    .filter((p) => p.status === "VERIFIED")
    .reduce((s, p) => s + Number(p.amount), 0);

  const totalPending = payments
    .filter((p) => p.status === "PENDING")
    .reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">การชำระเงิน</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide">รายการทั้งหมด</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{payments.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide">ยืนยันแล้ว</div>
          <div className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(totalVerified)}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide">รอยืนยัน</div>
          <div className="text-2xl font-bold text-yellow-600 mt-1">{formatCurrency(totalPending)}</div>
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="text-center py-12 text-gray-400">ยังไม่มีรายการชำระเงิน</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase font-medium">เลขที่</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase font-medium">การจอง / แขก</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase font-medium">จำนวน</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase font-medium">วิธี</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase font-medium">ประเภท</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase font-medium">สถานะ</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase font-medium">วันที่</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.paymentReference}</td>
                  <td className="px-4 py-3">
                    <Link href={`/bookings/${p.bookingId}`} className="text-blue-600 hover:underline font-medium">
                      {p.booking.bookingReference}
                    </Link>
                    <div className="text-xs text-gray-400">{p.booking.guest.fullName} · ห้อง {p.booking.room.roomNumber}</div>
                  </td>
                  <td className="px-4 py-3 font-semibold">{formatCurrency(Number(p.amount))}</td>
                  <td className="px-4 py-3 text-gray-600">{methodLabel(p.method as string)}</td>
                  <td className="px-4 py-3 text-gray-600">{purposeLabel(p.purpose as string)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusClass(p.status as string)}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {p.paidAt ? formatDateTime(p.paidAt) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function methodLabel(m: string) {
  const map: Record<string, string> = {
    CASH: "เงินสด",
    BANK_TRANSFER: "โอน",
    PROMPTPAY: "พร้อมเพย์",
    PAYMENT_GATEWAY: "Gateway",
    OTA: "OTA",
    OTHER: "อื่นๆ",
  };
  return map[m] ?? m;
}

function purposeLabel(p: string) {
  const map: Record<string, string> = {
    DEPOSIT: "มัดจำ",
    BALANCE: "ส่วนที่เหลือ",
    FULL: "เต็มจำนวน",
    EXTRA_CHARGE: "ค่าเพิ่ม",
  };
  return map[p] ?? p;
}

function statusClass(s: string) {
  const map: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-700",
    VERIFIED: "bg-green-100 text-green-700",
    FAILED: "bg-red-100 text-red-700",
    REFUNDED: "bg-purple-100 text-purple-700",
    CANCELLED: "bg-gray-100 text-gray-500",
  };
  return map[s] ?? "bg-gray-100 text-gray-500";
}
