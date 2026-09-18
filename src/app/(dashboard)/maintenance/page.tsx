import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { createMaintenanceRequest } from "@/app/actions/maintenance";
import {
  MaintenanceStatusButton,
  RestoreRoomButton,
} from "@/components/maintenance/MaintenanceActionButton";

async function createRequestAction(formData: FormData): Promise<void> {
  "use server";
  await createMaintenanceRequest(formData);
}

const STATUS_BADGE: Record<string, string> = {
  OPEN: "bg-red-100 text-red-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  RESOLVED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

const STATUS_TH: Record<string, string> = {
  OPEN: "เปิด",
  IN_PROGRESS: "ดำเนินการ",
  RESOLVED: "แก้ไขแล้ว",
  CANCELLED: "ยกเลิก",
};

const PRIORITY_BADGE: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-600",
  NORMAL: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

const PRIORITY_TH: Record<string, string> = {
  LOW: "ต่ำ",
  NORMAL: "ปกติ",
  HIGH: "สูง",
  URGENT: "เร่งด่วน",
};

export default async function MaintenancePage(
  props: PageProps<"/maintenance">
) {
  const user = await getSession();
  if (!user) redirect("/login");

  const sp = await props.searchParams;
  const filter = (sp.status as string) || "active";

  const [rooms, requests, outOfOrderRooms] = await Promise.all([
    db.room.findMany({
      where: { active: true },
      orderBy: { roomNumber: "asc" },
      select: { id: true, roomNumber: true, status: true },
    }),
    db.maintenanceRequest.findMany({
      where:
        filter === "active"
          ? { status: { in: ["OPEN", "IN_PROGRESS"] } }
          : filter === "resolved"
          ? { status: "RESOLVED" }
          : {},
      include: { room: { select: { roomNumber: true, status: true, id: true } } },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: 50,
    }),
    db.room.findMany({
      where: { status: "OUT_OF_ORDER", active: true },
      select: { id: true, roomNumber: true },
    }),
  ]);

  const openCount = await db.maintenanceRequest.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } });
  const urgentCount = await db.maintenanceRequest.count({
    where: { status: { in: ["OPEN", "IN_PROGRESS"] }, priority: { in: ["HIGH", "URGENT"] } },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">ซ่อมบำรุง</h1>
        <p className="text-sm text-gray-500 mt-0.5">Maintenance — แจ้งซ่อมและติดตามงานซ่อมบำรุง</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className={`rounded-xl border-2 p-4 ${openCount > 0 ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}`}>
          <div className={`text-2xl font-bold ${openCount > 0 ? "text-red-700" : "text-green-700"}`}>{openCount}</div>
          <div className="text-xs text-gray-600 mt-0.5">งานค้างอยู่</div>
        </div>
        <div className={`rounded-xl border-2 p-4 ${urgentCount > 0 ? "border-orange-200 bg-orange-50" : "border-gray-200 bg-gray-50"}`}>
          <div className={`text-2xl font-bold ${urgentCount > 0 ? "text-orange-700" : "text-gray-400"}`}>{urgentCount}</div>
          <div className="text-xs text-gray-600 mt-0.5">เร่งด่วน/สำคัญ</div>
        </div>
        <div className={`rounded-xl border-2 p-4 ${outOfOrderRooms.length > 0 ? "border-gray-300 bg-gray-100" : "border-gray-200 bg-gray-50"}`}>
          <div className={`text-2xl font-bold ${outOfOrderRooms.length > 0 ? "text-gray-700" : "text-gray-400"}`}>
            {outOfOrderRooms.length}
          </div>
          <div className="text-xs text-gray-600 mt-0.5">ห้องปิดซ่อม (OOO)</div>
        </div>
      </div>

      {/* OOO rooms banner */}
      {outOfOrderRooms.length > 0 && (
        <div className="bg-gray-100 border border-gray-300 rounded-xl p-4">
          <div className="text-sm font-semibold text-gray-700 mb-2">ห้องที่ปิดซ่อม (OUT_OF_ORDER)</div>
          <div className="flex flex-wrap gap-2">
            {outOfOrderRooms.map((r) => (
              <div key={r.id} className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-1.5">
                <span className="text-sm font-medium text-gray-800">ห้อง {r.roomNumber}</span>
                <RestoreRoomButton roomId={r.id} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Requests list */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filter tabs */}
          <div className="flex gap-1 border-b border-gray-200">
            {[
              { key: "active", label: "ค้างอยู่" },
              { key: "resolved", label: "แก้ไขแล้ว" },
              { key: "all", label: "ทั้งหมด" },
            ].map((t) => (
              <a
                key={t.key}
                href={`/maintenance?status=${t.key}`}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  filter === t.key
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                {t.label}
              </a>
            ))}
          </div>

          {requests.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-200">
              {filter === "active" ? "ไม่มีงานค้างอยู่ 🎉" : "ไม่มีข้อมูล"}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
              {requests.map((req) => (
                <div key={req.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">{req.title}</span>
                        {req.room && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            ห้อง {req.room.roomNumber}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_BADGE[req.priority]}`}>
                          {PRIORITY_TH[req.priority]}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[req.status]}`}>
                          {STATUS_TH[req.status]}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">{req.description}</div>
                      {req.assignedTo && (
                        <div className="text-xs text-gray-400 mt-1">มอบหมาย: {req.assignedTo}</div>
                      )}
                      {req.resolvedBy && (
                        <div className="text-xs text-gray-400 mt-1">
                          แก้ไขโดย: {req.resolvedBy}
                          {req.resolvedAt && (
                            <> · {new Date(req.resolvedAt).toLocaleDateString("th-TH")}</>
                          )}
                        </div>
                      )}
                      <div className="text-xs text-gray-400 mt-1">
                        แจ้งโดย {req.createdBy ?? "ระบบ"} ·{" "}
                        {new Date(req.createdAt).toLocaleDateString("th-TH")}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <MaintenanceStatusButton requestId={req.id} currentStatus={req.status} />
                      {req.room?.status === "OUT_OF_ORDER" && req.status === "RESOLVED" && (
                        <RestoreRoomButton roomId={req.room.id} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create request form */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden h-fit">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">แจ้งซ่อม</h3>
          </div>
          <form action={createRequestAction} className="p-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">หัวข้อ *</label>
              <input
                name="title"
                type="text"
                required
                placeholder="เช่น แอร์เสียห้อง 101"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">รายละเอียด *</label>
              <textarea
                name="description"
                required
                rows={3}
                placeholder="อธิบายปัญหาให้ชัดเจน..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">ห้องพัก (ถ้ามี)</label>
              <select
                name="roomId"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">ไม่ระบุห้อง / พื้นที่ส่วนกลาง</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    ห้อง {r.roomNumber}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">ความสำคัญ</label>
              <select
                name="priority"
                defaultValue="NORMAL"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="LOW">ต่ำ — รอได้</option>
                <option value="NORMAL">ปกติ</option>
                <option value="HIGH">สูง — ควรซ่อมโดยเร็ว</option>
                <option value="URGENT">เร่งด่วน — ต้องซ่อมทันที</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="outOfOrder"
                name="outOfOrder"
                value="true"
                className="rounded border-gray-300"
              />
              <label htmlFor="outOfOrder" className="text-xs text-gray-700">
                ปิดห้องพักชั่วคราว (OUT_OF_ORDER)
              </label>
            </div>
            <button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
            >
              แจ้งซ่อม
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
