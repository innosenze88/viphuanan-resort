import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate, formatCurrency } from "@/lib/utils";

const STATUS_BADGE: Record<string, { label: string; class: string }> = {
  CONFIRMED: { label: "จองแล้ว", class: "bg-amber-100 text-amber-800" },
  CHECKED_IN: { label: "เช็คอินแล้ว", class: "bg-green-100 text-green-800" },
  CHECKED_OUT: { label: "เช็คเอาท์แล้ว", class: "bg-gray-100 text-gray-700" },
  CANCELLED: { label: "ยกเลิก", class: "bg-red-100 text-red-700" },
  NO_SHOW: { label: "ไม่มา", class: "bg-purple-100 text-purple-700" },
};

export default async function BookingsPage() {
  const bookings = await db.booking.findMany({
    include: {
      guest: true,
      room: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">การจอง</h1>
          <p className="text-gray-500 text-sm mt-1">{bookings.length} รายการ</p>
        </div>
        <Link
          href="/bookings/new"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + สร้างการจองใหม่
        </Link>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-12 text-gray-400">ยังไม่มีการจอง</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3">เลขที่จอง</th>
                <th className="px-4 py-3">แขก</th>
                <th className="px-4 py-3">ห้อง</th>
                <th className="px-4 py-3">เช็คอิน</th>
                <th className="px-4 py-3">เช็คเอาท์</th>
                <th className="px-4 py-3">ยอดรวม</th>
                <th className="px-4 py-3">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bookings.map((b) => {
                const badge = STATUS_BADGE[b.status];
                return (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/bookings/${b.id}`} className="text-blue-600 hover:underline font-mono text-xs">
                        {b.bookingReference}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{b.guest.fullName}</td>
                    <td className="px-4 py-3 text-gray-600">ห้อง {b.room.roomNumber}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(b.checkInDate)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(b.checkOutDate)}</td>
                    <td className="px-4 py-3 text-gray-900">{formatCurrency(Number(b.grossAmount))}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${badge?.class}`}>
                        {badge?.label ?? b.status}
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
