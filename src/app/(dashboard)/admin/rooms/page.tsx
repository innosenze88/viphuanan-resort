import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { createRoom } from "@/app/actions/admin";
import { ToggleActiveButton } from "@/components/admin/AdminToggleButton";
import { formatCurrency } from "@/lib/utils";

const ROOM_STATUS_TH: Record<string, string> = {
  VACANT: "ว่าง",
  RESERVED: "จอง",
  OCCUPIED: "มีแขก",
  DIRTY: "รอทำความสะอาด",
  CLEANING: "กำลังทำความสะอาด",
  INSPECTED: "รอตรวจ",
  OUT_OF_ORDER: "ปิดซ่อม",
};

const ROOM_STATUS_COLOR: Record<string, string> = {
  VACANT: "bg-green-100 text-green-700",
  RESERVED: "bg-blue-100 text-blue-700",
  OCCUPIED: "bg-indigo-100 text-indigo-700",
  DIRTY: "bg-red-100 text-red-700",
  CLEANING: "bg-yellow-100 text-yellow-700",
  INSPECTED: "bg-purple-100 text-purple-700",
  OUT_OF_ORDER: "bg-gray-200 text-gray-500",
};

async function createRoomAction(formData: FormData): Promise<void> {
  "use server";
  await createRoom(formData);
}

export default async function AdminRoomsPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const canEdit = ["OWNER", "MANAGER"].includes(user.role);

  const rooms = await db.room.findMany({
    orderBy: { roomNumber: "asc" },
    include: { roomType: { select: { name: true } } },
  });

  const activeRooms = rooms.filter((r) => r.active);
  const inactiveRooms = rooms.filter((r) => !r.active);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <div className="text-xl font-bold text-gray-900">{rooms.length}</div>
          <div className="text-xs text-gray-500">ห้องทั้งหมด</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <div className="text-xl font-bold text-green-700">{activeRooms.length}</div>
          <div className="text-xs text-gray-500">ใช้งาน</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <div className="text-xl font-bold text-gray-400">{inactiveRooms.length}</div>
          <div className="text-xs text-gray-500">ปิดใช้งาน</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <div className="text-xl font-bold text-blue-700">
            {activeRooms.filter((r) => r.status === "VACANT").length}
          </div>
          <div className="text-xs text-gray-500">ว่างอยู่ตอนนี้</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Room list */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">ห้องพักทั้งหมด</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-2.5 text-xs text-gray-400 font-medium">ห้อง</th>
                <th className="text-left px-4 py-2.5 text-xs text-gray-400 font-medium">ประเภท</th>
                <th className="text-right px-4 py-2.5 text-xs text-gray-400 font-medium">ราคา/คืน</th>
                <th className="text-left px-4 py-2.5 text-xs text-gray-400 font-medium">สถานะ</th>
                <th className="px-4 py-2.5 text-xs text-gray-400 font-medium">การใช้งาน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rooms.map((room) => (
                <tr key={room.id} className={`hover:bg-gray-50 ${!room.active ? "opacity-40" : ""}`}>
                  <td className="px-4 py-3 font-semibold text-gray-900">{room.roomNumber}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {room.roomType?.name ?? <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {formatCurrency(Number(room.basePrice))}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${ROOM_STATUS_COLOR[room.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {ROOM_STATUS_TH[room.status] ?? room.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {canEdit ? (
                      <ToggleActiveButton id={room.id} active={room.active} type="room" />
                    ) : (
                      <span className={`text-xs ${room.active ? "text-green-600" : "text-gray-400"}`}>
                        {room.active ? "เปิด" : "ปิด"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Create room form */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden h-fit">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">เพิ่มห้องพักใหม่</h3>
          </div>
          {!canEdit ? (
            <div className="p-5 text-sm text-gray-500">
              ต้องการสิทธิ์ OWNER หรือ MANAGER
            </div>
          ) : (
            <form action={createRoomAction} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  เลขห้อง *
                </label>
                <input
                  name="roomNumber"
                  type="text"
                  required
                  placeholder="เช่น 101, A01, Suite-1"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  ราคาห้องพัก/คืน (บาท) *
                </label>
                <input
                  name="basePrice"
                  type="number"
                  required
                  min={0}
                  step={100}
                  placeholder="1500"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  รายละเอียด
                </label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="เช่น ห้องพักมาตรฐาน วิวสระว่ายน้ำ..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
              >
                เพิ่มห้องพัก
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
