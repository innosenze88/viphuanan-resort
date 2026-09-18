import { db } from "@/lib/db";
import { RoomStatus } from "@prisma/client";

const STATUS_CONFIG: Record<
  RoomStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  VACANT: {
    label: "ว่าง",
    bg: "bg-green-50",
    text: "text-green-800",
    dot: "bg-green-500",
  },
  OCCUPIED: {
    label: "มีแขก",
    bg: "bg-red-50",
    text: "text-red-800",
    dot: "bg-red-500",
  },
  RESERVED: {
    label: "จอง",
    bg: "bg-amber-50",
    text: "text-amber-800",
    dot: "bg-amber-500",
  },
  DIRTY: {
    label: "รอทำความสะอาด",
    bg: "bg-purple-50",
    text: "text-purple-800",
    dot: "bg-purple-500",
  },
  CLEANING: {
    label: "กำลังทำความสะอาด",
    bg: "bg-blue-50",
    text: "text-blue-800",
    dot: "bg-blue-500",
  },
  INSPECTED: {
    label: "ตรวจแล้ว",
    bg: "bg-cyan-50",
    text: "text-cyan-800",
    dot: "bg-cyan-500",
  },
  OUT_OF_ORDER: {
    label: "ปิดปรับปรุง",
    bg: "bg-gray-100",
    text: "text-gray-600",
    dot: "bg-gray-400",
  },
};

export default async function RoomsPage() {
  const rooms = await db.room.findMany({
    where: { active: true },
    include: { roomType: true },
    orderBy: { roomNumber: "asc" },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">ห้องพักทั้งหมด</h1>
        <p className="text-gray-500 text-sm mt-1">
          {rooms.length} ห้อง — คลิกห้องเพื่อดูรายละเอียด
        </p>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {rooms.map((room) => {
          const cfg = STATUS_CONFIG[room.status];
          return (
            <div
              key={room.id}
              className={`${cfg.bg} border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-sm transition-shadow`}
            >
              <div className="text-2xl font-bold text-gray-900 mb-2">
                {room.roomNumber}
              </div>
              <div className={`flex items-center gap-1.5 ${cfg.text} text-xs font-medium`}>
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </div>
              {Number(room.basePrice) > 0 && (
                <div className="text-xs text-gray-500 mt-2">
                  ฿{Number(room.basePrice).toLocaleString("th-TH")}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
