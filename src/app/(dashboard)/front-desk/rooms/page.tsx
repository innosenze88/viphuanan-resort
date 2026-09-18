import Link from "next/link";
import { db } from "@/lib/db";
import { RoomStatus } from "@prisma/client";
import { formatDate } from "@/lib/utils";

const STATUS_CONFIG: Record<
  RoomStatus,
  { label: string; shortLabel: string; bg: string; border: string; text: string; dot: string }
> = {
  VACANT: {
    label: "ว่าง", shortLabel: "ว่าง",
    bg: "bg-green-50", border: "border-green-200", text: "text-green-800", dot: "bg-green-500",
  },
  OCCUPIED: {
    label: "มีแขก", shortLabel: "มีแขก",
    bg: "bg-red-50", border: "border-red-200", text: "text-red-800", dot: "bg-red-500",
  },
  RESERVED: {
    label: "จอง", shortLabel: "จอง",
    bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", dot: "bg-amber-500",
  },
  DIRTY: {
    label: "รอทำความสะอาด", shortLabel: "สกปรก",
    bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-800", dot: "bg-purple-500",
  },
  CLEANING: {
    label: "กำลังทำความสะอาด", shortLabel: "ทำความสะอาด",
    bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", dot: "bg-blue-500",
  },
  INSPECTED: {
    label: "ตรวจแล้ว", shortLabel: "ตรวจแล้ว",
    bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-800", dot: "bg-cyan-500",
  },
  OUT_OF_ORDER: {
    label: "ปิดปรับปรุง", shortLabel: "OOO",
    bg: "bg-gray-100", border: "border-gray-300", text: "text-gray-600", dot: "bg-gray-400",
  },
};

type RoomWithBooking = Awaited<ReturnType<typeof getRoomBoard>>[number];

async function getRoomBoard() {
  const rooms = await db.room.findMany({
    where: { active: true },
    include: {
      roomType: true,
      bookings: {
        where: {
          status: { in: ["CONFIRMED", "CHECKED_IN"] },
        },
        include: { guest: true },
        orderBy: { checkInDate: "asc" },
        take: 1,
      },
    },
    orderBy: { roomNumber: "asc" },
  });
  return rooms;
}

export default async function RoomBoardPage() {
  const rooms = await getRoomBoard();

  const counts = rooms.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Room Board</h1>
        <Link
          href="/bookings/new"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + สร้างการจอง
        </Link>
      </div>

      {/* Status legend */}
      <div className="flex flex-wrap gap-3 mb-6">
        {(Object.keys(STATUS_CONFIG) as RoomStatus[]).map((s) => {
          const cfg = STATUS_CONFIG[s];
          const count = counts[s] ?? 0;
          return (
            <div key={s} className="flex items-center gap-1.5 text-sm">
              <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
              <span className="text-gray-600">{cfg.label}</span>
              <span className="font-semibold text-gray-900">({count})</span>
            </div>
          );
        })}
      </div>

      {/* Room Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {rooms.map((room) => {
          const cfg = STATUS_CONFIG[room.status];
          const booking = room.bookings[0];

          return (
            <Link
              key={room.id}
              href={booking ? `/bookings/${booking.id}` : `/bookings/new?roomId=${room.id}`}
              className={`${cfg.bg} border ${cfg.border} rounded-xl p-4 hover:shadow-md transition-shadow block`}
            >
              {/* Room Number */}
              <div className="text-2xl font-bold text-gray-900 mb-1">{room.roomNumber}</div>

              {/* Status dot + label */}
              <div className={`flex items-center gap-1.5 ${cfg.text} text-xs font-medium mb-2`}>
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                {cfg.shortLabel}
              </div>

              {/* Guest info if occupied/reserved */}
              {booking && (
                <div className="mt-2 border-t border-gray-200 pt-2 text-xs text-gray-600 space-y-0.5">
                  <div className="font-medium text-gray-800 truncate">{booking.guest.fullName}</div>
                  <div className="text-gray-500">
                    {formatDate(booking.checkInDate)} → {formatDate(booking.checkOutDate)}
                  </div>
                  <div className="font-medium">฿{Number(booking.grossAmount).toLocaleString("th-TH")}</div>
                </div>
              )}

              {/* Base price if vacant */}
              {!booking && Number(room.basePrice) > 0 && (
                <div className="text-xs text-gray-400 mt-1">
                  ฿{Number(room.basePrice).toLocaleString("th-TH")}/คืน
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
