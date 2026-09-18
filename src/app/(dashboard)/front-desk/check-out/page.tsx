import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate, formatCurrency } from "@/lib/utils";
import { CheckOutButton } from "@/components/bookings/BookingActions";

export default async function CheckOutPage() {
  const bookings = await db.booking.findMany({
    where: { status: "CHECKED_IN" },
    include: { guest: true, room: true },
    orderBy: { checkInDate: "asc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">เช็คเอาท์</h1>

      {bookings.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          ไม่มีแขกที่รอเช็คเอาท์
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
            {bookings.length} ห้องที่มีแขก
          </div>
          <div className="divide-y divide-gray-100">
            {bookings.map((b) => (
              <div key={b.id} className="px-5 py-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900">ห้อง {b.room.roomNumber}</span>
                    <span className="font-mono text-xs text-gray-400">{b.bookingReference}</span>
                    <span className="text-sm text-gray-700">{b.guest.fullName}</span>
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5">
                    เช็คอิน {formatDate(b.checkInDate)} · เช็คเอาท์ {formatDate(b.checkOutDate)}
                    <span className="ml-3 font-medium text-gray-700">
                      {formatCurrency(Number(b.grossAmount))}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/bookings/${b.id}`} className="text-xs text-blue-600 hover:underline mr-2">
                    ดูรายละเอียด
                  </Link>
                  <CheckOutButton bookingId={b.id} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
