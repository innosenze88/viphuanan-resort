import Link from "next/link";
import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";

// ─── helpers ─────────────────────────────────────────────────────────────────

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function startOfTomorrow() {
  const d = startOfToday();
  d.setDate(d.getDate() + 1);
  return d;
}
function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

const ROOM_STATUS_COLOR: Record<string, string> = {
  OCCUPIED: "bg-red-500",
  RESERVED: "bg-amber-400",
  VACANT: "bg-green-400",
  DIRTY: "bg-orange-400",
  CLEANING: "bg-blue-400",
  INSPECTED: "bg-teal-400",
  OUT_OF_ORDER: "bg-gray-400",
};
const ROOM_STATUS_LABEL: Record<string, string> = {
  OCCUPIED: "มีแขก",
  RESERVED: "จอง",
  VACANT: "ว่าง",
  DIRTY: "สกปรก",
  CLEANING: "ทำความสะอาด",
  INSPECTED: "ตรวจแล้ว",
  OUT_OF_ORDER: "ปิดปรับปรุง",
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: "เงินสด",
  BANK_TRANSFER: "โอน",
  PROMPTPAY: "พร้อมเพย์",
  PAYMENT_GATEWAY: "บัตร",
  OTA: "OTA",
  OTHER: "อื่นๆ",
};

const ROLE_LABEL: Record<string, string> = {
  OWNER: "เจ้าของ",
  MANAGER: "ผู้จัดการ",
  FRONT_DESK: "Front Desk",
  ACCOUNTING: "บัญชี",
  HOUSEKEEPING: "แม่บ้าน",
};

// ─── data loader ─────────────────────────────────────────────────────────────

async function loadDashboardData() {
  const today = startOfToday();
  const tomorrow = startOfTomorrow();
  const monthStart = startOfMonth();

  const [
    rooms,
    todayArrivals,
    todayDepartures,
    pendingPaymentCount,
    todayPaymentSum,
    monthRevenue,
    overdueRegCount,
    pendingRegCount,
    pendingDocCount,
    recentPayments,
    pendingJournalCount,
  ] = await Promise.all([
    // All active rooms for minimap
    db.room.findMany({
      where: { active: true },
      orderBy: { roomNumber: "asc" },
      select: { id: true, roomNumber: true, status: true },
    }),

    // Expected check-ins today (CONFIRMED bookings)
    db.booking.findMany({
      where: {
        checkInDate: { gte: today, lt: tomorrow },
        status: { in: ["CONFIRMED", "CHECKED_IN"] },
      },
      orderBy: { checkInDate: "asc" },
      select: {
        id: true,
        bookingReference: true,
        checkInDate: true,
        checkOutDate: true,
        numberOfNights: true,
        grossAmount: true,
        status: true,
        guest: { select: { fullName: true, nationality: true } },
        room: { select: { roomNumber: true } },
      },
      take: 20,
    }),

    // Expected check-outs today (CHECKED_IN bookings)
    db.booking.findMany({
      where: {
        checkOutDate: { gte: today, lt: tomorrow },
        status: "CHECKED_IN",
      },
      orderBy: { checkOutDate: "asc" },
      select: {
        id: true,
        bookingReference: true,
        checkInDate: true,
        checkOutDate: true,
        numberOfNights: true,
        grossAmount: true,
        status: true,
        guest: { select: { fullName: true, nationality: true } },
        room: { select: { roomNumber: true } },
      },
      take: 20,
    }),

    // Pending payments count
    db.payment.count({ where: { status: "PENDING" } }),

    // Today's verified payments total
    db.payment.aggregate({
      where: {
        status: "VERIFIED",
        paidAt: { gte: today, lt: tomorrow },
      },
      _sum: { amount: true },
    }),

    // This month's recognized revenue (CHECKED_OUT bookings)
    db.booking.aggregate({
      where: {
        status: "CHECKED_OUT",
        checkOutDate: { gte: monthStart },
      },
      _sum: { grossAmount: true },
    }),

    // Overdue registrations
    db.registrationRecord.count({ where: { status: "OVERDUE" } }),

    // Pending registrations
    db.registrationRecord.count({ where: { status: "PENDING" } }),

    // Documents pending review
    db.document.count({ where: { status: "PENDING_REVIEW" } }),

    // Recent 6 verified payments
    db.payment.findMany({
      where: { status: "VERIFIED" },
      orderBy: { paidAt: "desc" },
      take: 6,
      select: {
        id: true,
        paymentReference: true,
        amount: true,
        method: true,
        paidAt: true,
        purpose: true,
        booking: { select: { bookingReference: true, id: true } },
      },
    }),

    // Pending journal entries
    db.journalEntry.count({
      where: { status: { in: ["PENDING_REVIEW", "VERIFIED", "APPROVED"] } },
    }),
  ]);

  return {
    rooms,
    todayArrivals,
    todayDepartures,
    pendingPaymentCount,
    todayPaymentSum: Number(todayPaymentSum._sum.amount ?? 0),
    monthRevenue: Number(monthRevenue._sum.grossAmount ?? 0),
    overdueRegCount,
    pendingRegCount,
    pendingDocCount,
    recentPayments,
    pendingJournalCount,
  };
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const [user, data] = await Promise.all([getSession(), loadDashboardData()]);

  const {
    rooms,
    todayArrivals,
    todayDepartures,
    pendingPaymentCount,
    todayPaymentSum,
    monthRevenue,
    overdueRegCount,
    pendingRegCount,
    pendingDocCount,
    recentPayments,
    pendingJournalCount,
  } = data;

  const totalRooms = rooms.length;
  const statusCount = rooms.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const occupied = statusCount["OCCUPIED"] ?? 0;
  const reserved = statusCount["RESERVED"] ?? 0;
  const vacant = statusCount["VACANT"] ?? 0;
  const dirty = statusCount["DIRTY"] ?? 0;
  const occupancyPct = totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0;

  const hasAlerts = overdueRegCount > 0 || pendingDocCount > 0 || pendingPaymentCount > 0 || pendingJournalCount > 0;

  const todayStr = new Date().toLocaleDateString("th-TH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">แดชบอร์ด</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {todayStr} · ยินดีต้อนรับ{" "}
            <span className="text-blue-600 font-medium">{user?.name}</span>{" "}
            <span className="text-gray-400">({ROLE_LABEL[user?.role ?? ""] ?? user?.role})</span>
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2">
          <Link
            href="/bookings/new"
            className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + จองห้อง
          </Link>
          <Link
            href="/front-desk/check-in"
            className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-4 py-2 rounded-lg transition-colors"
          >
            เช็คอิน
          </Link>
          <Link
            href="/front-desk/check-out"
            className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-4 py-2 rounded-lg transition-colors"
          >
            เช็คเอาท์
          </Link>
        </div>
      </div>

      {/* Alert banners */}
      {hasAlerts && (
        <div className="grid grid-cols-2 gap-3">
          {overdueRegCount > 0 && (
            <Link href="/registration?tab=overdue">
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3 hover:bg-red-100 transition-colors cursor-pointer">
                <span className="text-xl">⚠️</span>
                <div>
                  <div className="font-semibold text-red-800 text-sm">
                    {overdueRegCount} ทะเบียนเกินกำหนด
                  </div>
                  <div className="text-xs text-red-600">รร.4/ตม.30 เกิน 24 ชั่วโมง</div>
                </div>
              </div>
            </Link>
          )}
          {pendingDocCount > 0 && (
            <Link href="/documents/inbox">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3 hover:bg-amber-100 transition-colors cursor-pointer">
                <span className="text-xl">📄</span>
                <div>
                  <div className="font-semibold text-amber-800 text-sm">
                    {pendingDocCount} เอกสารรอตรวจสอบ
                  </div>
                  <div className="text-xs text-amber-600">สลิปโอนเงิน / ไฟล์แนบ</div>
                </div>
              </div>
            </Link>
          )}
          {pendingPaymentCount > 0 && (
            <Link href="/payments">
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-center gap-3 hover:bg-yellow-100 transition-colors cursor-pointer">
                <span className="text-xl">💰</span>
                <div>
                  <div className="font-semibold text-yellow-800 text-sm">
                    {pendingPaymentCount} รายการเงินรอยืนยัน
                  </div>
                  <div className="text-xs text-yellow-600">ตรวจสอบและยืนยันการชำระเงิน</div>
                </div>
              </div>
            </Link>
          )}
          {pendingJournalCount > 0 && (
            <Link href="/accounting/adjustments">
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-center gap-3 hover:bg-indigo-100 transition-colors cursor-pointer">
                <span className="text-xl">📒</span>
                <div>
                  <div className="font-semibold text-indigo-800 text-sm">
                    {pendingJournalCount} รายการบัญชีรออนุมัติ
                  </div>
                  <div className="text-xs text-indigo-600">รอ VERIFIED → APPROVED → POSTED</div>
                </div>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* Occupancy stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border-2 border-blue-200 p-4 col-span-1">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Occupancy</div>
          <div className="text-3xl font-bold text-blue-600 mt-1">{occupancyPct}%</div>
          <div className="text-xs text-gray-400 mt-1">{occupied}/{totalRooms} ห้อง</div>
          <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${occupancyPct}%` }}
            />
          </div>
        </div>
        <StatCard label="มีแขก" value={occupied} sub="ห้อง" color="text-red-600" bg="bg-red-50" />
        <StatCard label="จองแล้ว" value={reserved} sub="ห้อง" color="text-amber-600" bg="bg-amber-50" />
        <StatCard label="ว่าง" value={vacant} sub="ห้อง" color="text-green-600" bg="bg-green-50" />
        <StatCard label="ทำความสะอาด" value={dirty} sub="ห้อง" color="text-orange-600" bg="bg-orange-50" />
      </div>

      {/* Revenue stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide">รับเงินวันนี้</div>
          <div className="text-2xl font-bold text-green-700 mt-1">
            {formatCurrency(todayPaymentSum)}
          </div>
          <div className="text-xs text-gray-400 mt-1">ยอดที่ verified แล้ว</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide">รายได้เดือนนี้</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {formatCurrency(monthRevenue)}
          </div>
          <div className="text-xs text-gray-400 mt-1">จากการ check-out เดือนนี้</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide">ทะเบียนรอส่ง</div>
          <div className="text-2xl font-bold text-gray-700 mt-1">{pendingRegCount}</div>
          <div className="text-xs text-gray-400 mt-1">
            {overdueRegCount > 0 ? (
              <span className="text-red-500 font-medium">{overdueRegCount} เกินกำหนด!</span>
            ) : (
              "รร.3 / รร.4 / ตม.30"
            )}
          </div>
        </div>
      </div>

      {/* Room minimap */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900 text-sm">สถานะห้องพัก</h2>
          <Link href="/front-desk/rooms" className="text-xs text-blue-600 hover:underline">
            ดูแผนผังเต็ม →
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {rooms.map((r) => (
            <div
              key={r.id}
              title={`ห้อง ${r.roomNumber} — ${ROOM_STATUS_LABEL[r.status] ?? r.status}`}
              className={`w-12 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm ${ROOM_STATUS_COLOR[r.status] ?? "bg-gray-300"}`}
            >
              {r.roomNumber}
            </div>
          ))}
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
          {Object.entries(ROOM_STATUS_LABEL).map(([status, label]) => (
            <div key={status} className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className={`w-2.5 h-2.5 rounded-full ${ROOM_STATUS_COLOR[status]}`} />
              {label} ({statusCount[status] ?? 0})
            </div>
          ))}
        </div>
      </div>

      {/* Today's arrivals and departures */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Arrivals */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-green-50 border-b border-green-100 flex items-center justify-between">
            <h2 className="font-semibold text-green-900 text-sm">
              🛬 เช็คอินวันนี้ ({todayArrivals.length})
            </h2>
            <Link href="/front-desk/check-in" className="text-xs text-green-700 hover:underline">
              จัดการ →
            </Link>
          </div>
          {todayArrivals.length === 0 ? (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">ไม่มีแขกเช็คอินวันนี้</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {todayArrivals.map((b) => (
                <div key={b.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{b.guest.fullName}</div>
                    <div className="text-xs text-gray-400">
                      ห้อง {b.room.roomNumber} · {b.numberOfNights} คืน
                      {b.guest.nationality && b.guest.nationality !== "ไทย" && b.guest.nationality !== "Thai" && (
                        <span className="ml-1 text-purple-500">🌏 {b.guest.nationality}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium text-gray-700">{formatCurrency(Number(b.grossAmount))}</div>
                    <div className={`text-xs mt-0.5 ${b.status === "CHECKED_IN" ? "text-green-600" : "text-amber-600"}`}>
                      {b.status === "CHECKED_IN" ? "เช็คอินแล้ว" : "รอเช็คอิน"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Departures */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
            <h2 className="font-semibold text-blue-900 text-sm">
              🛫 เช็คเอาท์วันนี้ ({todayDepartures.length})
            </h2>
            <Link href="/front-desk/check-out" className="text-xs text-blue-700 hover:underline">
              จัดการ →
            </Link>
          </div>
          {todayDepartures.length === 0 ? (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">ไม่มีแขกเช็คเอาท์วันนี้</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {todayDepartures.map((b) => (
                <div key={b.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{b.guest.fullName}</div>
                    <div className="text-xs text-gray-400">
                      ห้อง {b.room.roomNumber} · เช็คอิน {formatDate(b.checkInDate)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium text-gray-700">{formatCurrency(Number(b.grossAmount))}</div>
                    <Link
                      href={`/bookings/${b.id}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      จัดการ →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent payments */}
      {recentPayments.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">💳 รายการชำระเงินล่าสุด</h2>
            <Link href="/payments" className="text-xs text-blue-600 hover:underline">
              ดูทั้งหมด →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentPayments.map((p) => (
              <div key={p.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <div className="text-sm text-gray-900 font-mono">{p.paymentReference}</div>
                  <div className="text-xs text-gray-400">
                    {PAYMENT_METHOD_LABEL[p.method] ?? p.method}
                    {p.booking && (
                      <> · <Link href={`/bookings/${p.booking.id}`} className="hover:underline">{p.booking.bookingReference}</Link></>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-green-700">{formatCurrency(Number(p.amount))}</div>
                  <div className="text-xs text-gray-400">
                    {p.paidAt ? new Date(p.paidAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "—"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── sub-components ──────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  color,
  bg,
}: {
  label: string;
  value: number;
  sub: string;
  color: string;
  bg: string;
}) {
  return (
    <div className={`rounded-xl border border-gray-200 p-4 ${bg}`}>
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className={`text-3xl font-bold mt-1 ${color}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-1">{sub}</div>
    </div>
  );
}
