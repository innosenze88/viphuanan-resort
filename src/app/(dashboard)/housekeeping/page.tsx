import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { createHousekeepingTask } from "@/app/actions/housekeeping";
import { TaskActionButton } from "@/components/housekeeping/TaskActionButton";

async function createTaskAction(formData: FormData): Promise<void> {
  "use server";
  await createHousekeepingTask(formData);
}

const ROOM_STATUS_COLOR: Record<string, string> = {
  VACANT: "bg-green-100 text-green-800 border-green-200",
  RESERVED: "bg-blue-100 text-blue-800 border-blue-200",
  OCCUPIED: "bg-indigo-100 text-indigo-800 border-indigo-200",
  DIRTY: "bg-red-100 text-red-800 border-red-300",
  CLEANING: "bg-yellow-100 text-yellow-800 border-yellow-300",
  INSPECTED: "bg-purple-100 text-purple-800 border-purple-200",
  OUT_OF_ORDER: "bg-gray-200 text-gray-500 border-gray-300",
};

const ROOM_STATUS_TH: Record<string, string> = {
  VACANT: "ว่าง",
  RESERVED: "จอง",
  OCCUPIED: "มีแขก",
  DIRTY: "ต้องทำความสะอาด",
  CLEANING: "กำลังทำความสะอาด",
  INSPECTED: "รอตรวจ",
  OUT_OF_ORDER: "ปิดซ่อม",
};

const TASK_STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-red-100 text-red-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  DONE: "bg-purple-100 text-purple-700",
  INSPECTED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

const TASK_STATUS_TH: Record<string, string> = {
  PENDING: "รอดำเนินการ",
  IN_PROGRESS: "กำลังดำเนินการ",
  DONE: "เสร็จแล้ว/รอตรวจ",
  INSPECTED: "ผ่านการตรวจ",
  CANCELLED: "ยกเลิก",
};

const TASK_TYPE_TH: Record<string, string> = {
  CHECKOUT_CLEAN: "ทำความสะอาดหลัง C/O",
  DAILY_SERVICE: "บริการรายวัน",
  DEEP_CLEAN: "ทำความสะอาดใหญ่",
  INSPECTION: "ตรวจสอบ",
  OTHER: "อื่นๆ",
};

const PRIORITY_BADGE: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-600",
  NORMAL: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

export default async function HousekeepingPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  const [rooms, activeTasks, recentDone] = await Promise.all([
    db.room.findMany({
      where: { active: true },
      orderBy: { roomNumber: "asc" },
      select: { id: true, roomNumber: true, status: true },
    }),
    // Active tasks: PENDING or IN_PROGRESS
    db.housekeepingTask.findMany({
      where: { status: { in: ["PENDING", "IN_PROGRESS", "DONE"] } },
      include: { room: { select: { roomNumber: true } } },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    }),
    // Done/Inspected tasks from today
    db.housekeepingTask.findMany({
      where: {
        status: "INSPECTED",
        inspectedAt: { gte: today, lt: tomorrow },
      },
      include: { room: { select: { roomNumber: true } } },
      orderBy: { inspectedAt: "desc" },
      take: 20,
    }),
  ]);

  // Rooms with incoming arrivals today (need to be ready)
  const arrivalsToday = await db.booking.findMany({
    where: {
      checkInDate: today,
      status: { in: ["CONFIRMED"] },
    },
    select: { roomId: true },
  });
  const arrivalRoomIds = new Set(arrivalsToday.map((b) => b.roomId));

  // Stats
  const dirtyCount = rooms.filter((r) => r.status === "DIRTY").length;
  const cleaningCount = rooms.filter((r) => r.status === "CLEANING").length;
  const inspectedCount = rooms.filter((r) => r.status === "INSPECTED").length;
  const vacantCount = rooms.filter((r) => r.status === "VACANT").length;
  const outOfOrderCount = rooms.filter((r) => r.status === "OUT_OF_ORDER").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">แม่บ้าน</h1>
          <p className="text-sm text-gray-500 mt-0.5">Housekeeping — สถานะห้องพักและงานทำความสะอาด</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "ต้องทำ", count: dirtyCount, cls: "border-red-200 bg-red-50", num: "text-red-700" },
          { label: "กำลังทำ", count: cleaningCount, cls: "border-yellow-200 bg-yellow-50", num: "text-yellow-700" },
          { label: "รอตรวจ", count: inspectedCount, cls: "border-purple-200 bg-purple-50", num: "text-purple-700" },
          { label: "ว่าง/สะอาด", count: vacantCount, cls: "border-green-200 bg-green-50", num: "text-green-700" },
          { label: "ปิดซ่อม", count: outOfOrderCount, cls: "border-gray-200 bg-gray-50", num: "text-gray-500" },
        ].map((s) => (
          <div key={s.label} className={`border-2 rounded-xl p-3 text-center ${s.cls}`}>
            <div className={`text-2xl font-bold ${s.num}`}>{s.count}</div>
            <div className="text-xs text-gray-600 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Urgent banner */}
      {dirtyCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800 flex items-center gap-2">
          <span className="text-base">🧹</span>
          <span>มี {dirtyCount} ห้องที่ต้องทำความสะอาด</span>
          {arrivalRoomIds.size > 0 && (
            <span className="font-semibold ml-1">· {arrivalRoomIds.size} ห้องมีแขกเช็คอินวันนี้!</span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Room board */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">สถานะห้องพักทั้งหมด</h3>
          </div>
          <div className="p-4 grid grid-cols-5 gap-2">
            {rooms.map((room) => {
              const isArrival = arrivalRoomIds.has(room.id);
              return (
                <div
                  key={room.id}
                  className={`relative border-2 rounded-lg p-2.5 text-center text-xs font-medium ${
                    ROOM_STATUS_COLOR[room.status] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {isArrival && (
                    <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-orange-400 rounded-full border border-white" title="มีแขกเช็คอินวันนี้" />
                  )}
                  <div className="font-bold text-sm">{room.roomNumber}</div>
                  <div className="text-xs opacity-80 mt-0.5 leading-tight">
                    {ROOM_STATUS_TH[room.status] ?? room.status}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div className="px-4 pb-3 flex flex-wrap gap-3">
            {Object.entries(ROOM_STATUS_TH).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5 text-xs text-gray-500">
                <div className={`w-2.5 h-2.5 rounded border ${ROOM_STATUS_COLOR[k]?.split(" ")[0] ?? "bg-gray-200"}`} />
                {v}
              </div>
            ))}
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-2.5 h-2.5 rounded-full bg-orange-400" />
              เช็คอินวันนี้
            </div>
          </div>
        </div>

        {/* Create task form */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">สร้างงาน</h3>
          </div>
          <form action={createTaskAction} className="p-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">ห้องพัก *</label>
              <select
                name="roomId"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">เลือกห้อง...</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    ห้อง {r.roomNumber} ({ROOM_STATUS_TH[r.status] ?? r.status})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">ประเภทงาน</label>
              <select
                name="taskType"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(TASK_TYPE_TH).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
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
                <option value="LOW">ต่ำ</option>
                <option value="NORMAL">ปกติ</option>
                <option value="HIGH">สูง</option>
                <option value="URGENT">เร่งด่วน</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">มอบหมายให้</label>
              <input
                name="assignedTo"
                type="text"
                placeholder="ชื่อพนักงาน..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">หมายเหตุ</label>
              <textarea
                name="notes"
                rows={2}
                placeholder="รายละเอียดเพิ่มเติม..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
            >
              สร้างงาน
            </button>
          </form>
        </div>
      </div>

      {/* Active tasks */}
      {activeTasks.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">
              งานที่รอดำเนินการ ({activeTasks.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-50">
            {activeTasks.map((task) => (
              <div key={task.id} className="px-5 py-3 flex items-center gap-4">
                <div className="w-12 text-center">
                  <div className="text-sm font-bold text-gray-900">{task.room.roomNumber}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-800">
                    {TASK_TYPE_TH[task.taskType] ?? task.taskType}
                  </div>
                  {task.assignedTo && (
                    <div className="text-xs text-gray-500 mt-0.5">มอบหมาย: {task.assignedTo}</div>
                  )}
                  {task.notes && (
                    <div className="text-xs text-gray-400 mt-0.5 truncate">{task.notes}</div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_BADGE[task.priority]}`}>
                    {task.priority}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${TASK_STATUS_BADGE[task.status]}`}>
                    {TASK_STATUS_TH[task.status]}
                  </span>
                  <TaskActionButton taskId={task.id} currentStatus={task.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recently completed */}
      {recentDone.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">ผ่านการตรวจวันนี้ ({recentDone.length})</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {recentDone.map((task) => (
              <div key={task.id} className="px-5 py-3 flex items-center gap-4 text-sm text-gray-600">
                <div className="font-bold text-gray-900 w-12 text-center">{task.room.roomNumber}</div>
                <div className="flex-1">{TASK_TYPE_TH[task.taskType]}</div>
                <div className="text-xs text-gray-400">
                  ตรวจโดย {task.inspectedBy ?? "—"}
                  {task.inspectedAt && (
                    <> · {new Date(task.inspectedAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</>
                  )}
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                  ผ่าน ✓
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTasks.length === 0 && dirtyCount === 0 && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">✨</div>
          <div>ไม่มีงานค้างอยู่ ห้องทุกห้องพร้อมให้บริการ</div>
        </div>
      )}
    </div>
  );
}
