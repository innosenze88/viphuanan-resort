import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";

const BOOKING_STATUS_LABEL: Record<string, string> = {
  CONFIRMED: "จองแล้ว",
  CHECKED_IN: "เช็คอินแล้ว",
  CHECKED_OUT: "เช็คเอาท์แล้ว",
  CANCELLED: "ยกเลิก",
  NO_SHOW: "ไม่มา",
};

export default async function GuestDetailPage(
  props: PageProps<"/guests/[id]">
) {
  const { id } = await props.params;

  const guest = await db.guest.findUnique({
    where: { id, active: true },
    include: {
      bookings: {
        include: { room: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!guest) notFound();

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{guest.fullName}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {guest.nationality ?? "—"} · {guest.phone ?? "—"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/bookings/new?guestId=${guest.id}`}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + สร้างการจอง
          </Link>
          <Link
            href={`/guests/${guest.id}/edit`}
            className="border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            แก้ไข
          </Link>
        </div>
      </div>

      {/* Info card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4 grid grid-cols-2 gap-4 text-sm">
        <InfoRow label="เพศ" value={
          guest.gender === "MALE" ? "ชาย" :
          guest.gender === "FEMALE" ? "หญิง" : "ไม่ระบุ"
        } />
        <InfoRow label="วันเกิด" value={guest.dateOfBirth ? formatDate(guest.dateOfBirth) : "—"} />
        <InfoRow label="สัญชาติ" value={guest.nationality ?? "—"} />
        <InfoRow label="เบอร์โทร" value={guest.phone ?? "—"} />
        <InfoRow label="อีเมล" value={guest.email ?? "—"} />
        <InfoRow label="เลขบัตร" value={
          guest.idNumber ? `${guest.idType ?? ""} ${guest.idNumber}` : "—"
        } />
        {guest.address && (
          <div className="col-span-2">
            <InfoRow label="ที่อยู่" value={guest.address} />
          </div>
        )}
        {guest.notes && (
          <div className="col-span-2">
            <InfoRow label="หมายเหตุ" value={guest.notes} />
          </div>
        )}
      </div>

      {/* Booking history */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">ประวัติการจอง</h2>
        </div>
        {guest.bookings.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-400 text-sm">
            ยังไม่มีประวัติการจอง
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase">
                <th className="px-5 py-3">เลขที่จอง</th>
                <th className="px-5 py-3">ห้อง</th>
                <th className="px-5 py-3">เช็คอิน</th>
                <th className="px-5 py-3">เช็คเอาท์</th>
                <th className="px-5 py-3">ยอดรวม</th>
                <th className="px-5 py-3">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {guest.bookings.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <Link href={`/bookings/${b.id}`} className="text-blue-600 hover:underline font-mono text-xs">
                      {b.bookingReference}
                    </Link>
                  </td>
                  <td className="px-5 py-3">{b.room.roomNumber}</td>
                  <td className="px-5 py-3">{formatDate(b.checkInDate)}</td>
                  <td className="px-5 py-3">{formatDate(b.checkOutDate)}</td>
                  <td className="px-5 py-3">฿{Number(b.grossAmount).toLocaleString("th-TH")}</td>
                  <td className="px-5 py-3">
                    <span className="text-xs">{BOOKING_STATUS_LABEL[b.status] ?? b.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-gray-900 mt-0.5">{value}</div>
    </div>
  );
}
