import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

const ROLE_LABEL: Record<string, string> = {
  OWNER: "เจ้าของ",
  MANAGER: "ผู้จัดการ",
  FRONT_DESK: "พนักงาน Front Desk",
  ACCOUNTING: "บัญชี",
  HOUSEKEEPING: "แม่บ้าน",
};

export default async function DashboardPage() {
  const user = await getSession();

  const rooms = await db.room.findMany({
    where: { active: true },
    orderBy: { roomNumber: "asc" },
  });

  const statusCount = rooms.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const totalRooms = rooms.length;
  const occupied = statusCount["OCCUPIED"] ?? 0;
  const reserved = statusCount["RESERVED"] ?? 0;
  const vacant = statusCount["VACANT"] ?? 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">แดชบอร์ด</h1>
        <p className="text-gray-500 text-sm mt-1">
          ยินดีต้อนรับ {user?.name} ·{" "}
          <span className="text-blue-600">
            {ROLE_LABEL[user?.role ?? ""] ?? user?.role}
          </span>
        </p>
      </div>

      {/* Room summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="ห้องทั้งหมด" value={totalRooms} color="text-gray-900" />
        <StatCard label="มีแขก" value={occupied} color="text-red-600" />
        <StatCard label="จองแล้ว" value={reserved} color="text-amber-600" />
        <StatCard label="ว่าง" value={vacant} color="text-green-600" />
      </div>

      {/* Phase notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <h2 className="font-semibold text-blue-900 mb-1">🚧 Phase 0 — Foundation เสร็จสมบูรณ์</h2>
        <p className="text-sm text-blue-700">
          ระบบ Authentication, RBAC, Database, Audit Log, Storage และห้องพัก 15 ห้องพร้อมใช้งาน
          <br />
          Phase 1 (Resort Core: Room Board, Guest, Booking, Stay, Check-in/out) จะเริ่มถัดไป
        </p>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
    </div>
  );
}
