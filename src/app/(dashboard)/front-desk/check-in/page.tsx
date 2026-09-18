import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { CheckInButton } from "@/components/bookings/BookingActions";

export default async function CheckInPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const bookings = await db.booking.findMany({
    where: {
      status: "CONFIRMED",
      checkInDate: { lte: new Date(today.getTime() + 86400000 * 2) },
    },
    include: { guest: true, room: true },
    orderBy: { checkInDate: "asc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">เช็คอิน</h1>

      {bookings.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          ไม่มีการจองที่รอเช็คอิน
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
            {bookings.length} รายการรอเช็คอิน
          </div>
          <div className="divide-y divide-gray-100">
            {bookings.map((b) => (
              <div key={b.id} className="px-5 py-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-gray-400">{b.bookingReference}</span>
                    <span className="text-sm font-medium text-gray-900">{b.guest.fullName}</span>
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5">
                    ห้อง {b.room.roomNumber} · เช็คอิน {formatDate(b.checkInDate)} · เช็คเอาท์ {formatDate(b.checkOutDate)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/bookings/${b.id}`} className="text-xs text-blue-600 hover:underline mr-2">
                    ดูรายละเอียด
                  </Link>
                  <CheckInButton bookingId={b.id} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
