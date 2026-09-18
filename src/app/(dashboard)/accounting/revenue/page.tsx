import Link from "next/link";
import { db } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function RevenuePage() {
  // Revenue = booking.grossAmount of CHECKED_OUT bookings — NOT sum(payments)
  const bookings = await db.booking.findMany({
    where: { status: "CHECKED_OUT" },
    include: { guest: { select: { fullName: true } }, room: { select: { roomNumber: true } } },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  const totalRevenue = bookings.reduce((s, b) => s + Number(b.grossAmount), 0);

  // Monthly breakdown
  const byMonth: Record<string, number> = {};
  for (const b of bookings) {
    const key = b.checkOutDate.toISOString().slice(0, 7);
    byMonth[key] = (byMonth[key] ?? 0) + Number(b.grossAmount);
  }
  const months = Object.entries(byMonth).sort(([a], [b]) => b.localeCompare(a)).slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide">รายได้รวม (Recognised)</div>
          <div className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(totalRevenue)}</div>
          <div className="text-xs text-gray-400 mt-1">จาก {bookings.length} การจอง (Check-out)</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide">เดือนนี้</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {formatCurrency(byMonth[new Date().toISOString().slice(0, 7)] ?? 0)}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 col-span-1">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">รายเดือน (6 เดือนล่าสุด)</div>
          <div className="space-y-1">
            {months.map(([month, amt]) => (
              <div key={month} className="flex justify-between text-xs">
                <span className="text-gray-500">{month}</span>
                <span className="font-medium">{formatCurrency(amt)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <strong>หมายเหตุ:</strong> รายได้ที่แสดงนี้คำนวณจาก <code>booking.grossAmount</code> ของการจองที่ Check-out แล้ว — ไม่ใช่ยอดรวมการชำระเงิน เพื่อป้องกันการนับซ้ำจากมัดจำ
      </div>

      {/* Booking revenue table */}
      {bookings.length === 0 ? (
        <div className="text-center py-12 text-gray-400">ยังไม่มีรายได้ที่บันทึก</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase font-medium">การจอง</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase font-medium">แขก</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase font-medium">ห้อง</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase font-medium">Check-out</th>
                <th className="text-right px-4 py-3 text-xs text-gray-500 uppercase font-medium">รายได้</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/bookings/${b.id}`} className="text-blue-600 hover:underline font-mono text-xs">
                      {b.bookingReference}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{b.guest.fullName}</td>
                  <td className="px-4 py-3 text-gray-500">ห้อง {b.room.roomNumber}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(b.checkOutDate)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {formatCurrency(Number(b.grossAmount))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-200">
                <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-gray-700 text-right">รวมทั้งหมด</td>
                <td className="px-4 py-3 text-right font-bold text-green-700">{formatCurrency(totalRevenue)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
