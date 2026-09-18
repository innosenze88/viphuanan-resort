import Link from "next/link";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";

function monthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end, daysInMonth: new Date(year, month, 0).getDate() };
}

export default async function OccupancyReportPage(
  props: PageProps<"/reports/occupancy">
) {
  const sp = await props.searchParams;
  const now = new Date();
  const year = sp.year ? parseInt(sp.year as string) : now.getFullYear();
  const month = sp.month ? parseInt(sp.month as string) : now.getMonth() + 1;

  const { start, end, daysInMonth } = monthRange(year, month);
  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  const monthLabel = start.toLocaleDateString("th-TH", { year: "numeric", month: "long" });

  const [rooms, stays] = await Promise.all([
    db.room.findMany({
      where: { active: true },
      orderBy: { roomNumber: "asc" },
      select: { id: true, roomNumber: true, basePrice: true },
    }),
    // Stays that overlap with this month (checked in before month end, checked out after month start)
    db.stay.findMany({
      where: {
        status: { in: ["CHECKED_IN", "CHECKED_OUT"] },
        actualCheckIn: { lt: end },
        OR: [
          { actualCheckOut: { gte: start } },
          { actualCheckOut: null }, // Still checked in
        ],
      },
      select: {
        roomId: true,
        actualCheckIn: true,
        actualCheckOut: true,
      },
    }),
  ]);

  const totalRooms = rooms.length;

  // For each day of the month, compute which rooms are occupied
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const date = new Date(year, month - 1, i + 1);
    const dayEnd = new Date(year, month - 1, i + 2);

    const occupiedRoomIds = new Set<string>();
    for (const stay of stays) {
      const checkIn = stay.actualCheckIn ? new Date(stay.actualCheckIn) : null;
      const checkOut = stay.actualCheckOut ? new Date(stay.actualCheckOut) : null;
      if (!checkIn) continue;
      // Room is occupied on this day if: checkIn < dayEnd AND (checkOut is null OR checkOut >= date)
      if (checkIn < dayEnd && (!checkOut || checkOut >= date)) {
        occupiedRoomIds.add(stay.roomId);
      }
    }

    const occupied = occupiedRoomIds.size;
    const occ = totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0;
    return { date, day: i + 1, occupied, available: totalRooms - occupied, occPct: occ };
  });

  const avgOccupancy =
    days.length > 0
      ? Math.round(days.reduce((s, d) => s + d.occPct, 0) / days.length)
      : 0;

  const totalRoomNights = days.reduce((s, d) => s + d.occupied, 0);
  const availableRoomNights = totalRooms * daysInMonth;

  // Monthly revenue for ADR
  const monthRevenue = await db.booking.aggregate({
    where: {
      status: "CHECKED_OUT",
      checkOutDate: { gte: start, lt: end },
    },
    _sum: { grossAmount: true, numberOfNights: true },
  });
  const revenue = Number(monthRevenue._sum.grossAmount ?? 0);
  const nights = monthRevenue._sum.numberOfNights ?? 0;
  const adr = nights > 0 ? revenue / nights : 0;
  const revPar = adr * (avgOccupancy / 100);

  // Color coding for occupancy cells
  function occColor(pct: number): string {
    if (pct >= 80) return "bg-red-500 text-white";
    if (pct >= 60) return "bg-orange-400 text-white";
    if (pct >= 40) return "bg-amber-300 text-gray-800";
    if (pct >= 20) return "bg-green-300 text-gray-800";
    return "bg-gray-100 text-gray-500";
  }

  return (
    <div className="space-y-6">
      {/* Month nav */}
      <div className="flex items-center gap-3">
        <Link
          href={`/reports/occupancy?year=${prev.y}&month=${prev.m}`}
          className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
        >
          ←
        </Link>
        <h2 className="text-lg font-bold text-gray-900">{monthLabel}</h2>
        <Link
          href={`/reports/occupancy?year=${next.y}&month=${next.m}`}
          className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
        >
          →
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border-2 border-blue-200 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Avg Occupancy</div>
          <div className="text-3xl font-bold text-blue-700 mt-1">{avgOccupancy}%</div>
          <div className="text-xs text-gray-400 mt-1">{totalRoomNights} / {availableRoomNights} คืน</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide">ADR</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(adr)}</div>
          <div className="text-xs text-gray-400 mt-1">ราคาเฉลี่ยต่อคืน</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide">RevPAR</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(revPar)}</div>
          <div className="text-xs text-gray-400 mt-1">รายได้ต่อห้องที่มี</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Room-nights ขาย</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{totalRoomNights}</div>
          <div className="text-xs text-gray-400 mt-1">จาก {availableRoomNights} คืนที่มี</div>
        </div>
      </div>

      {/* Daily occupancy grid */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">Occupancy รายวัน</h3>
        </div>
        <div className="p-4">
          <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
            {/* Day-of-week headers */}
            {["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"].map((d) => (
              <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">
                {d}
              </div>
            ))}

            {/* Leading blanks for day-of-week alignment */}
            {Array.from({
              length: (start.getDay() === 0 ? 6 : start.getDay() - 1),
            }).map((_, i) => (
              <div key={`blank-${i}`} />
            ))}

            {/* Day cells */}
            {days.map((d) => {
              const isToday =
                d.date.toDateString() === now.toDateString();
              return (
                <div
                  key={d.day}
                  className={`rounded-lg p-1.5 text-center ${occColor(d.occPct)} ${
                    isToday ? "ring-2 ring-blue-500" : ""
                  }`}
                  title={`${d.date.toLocaleDateString("th-TH")} — ${d.occupied}/${totalRooms} ห้อง (${d.occPct}%)`}
                >
                  <div className="text-xs font-bold">{d.day}</div>
                  <div className="text-xs opacity-80">{d.occPct}%</div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-4 flex-wrap">
            {[
              { label: "0–19%", cls: "bg-gray-100" },
              { label: "20–39%", cls: "bg-green-300" },
              { label: "40–59%", cls: "bg-amber-300" },
              { label: "60–79%", cls: "bg-orange-400" },
              { label: "80–100%", cls: "bg-red-500" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5 text-xs text-gray-500">
                <div className={`w-3 h-3 rounded ${l.cls}`} />
                {l.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">ตารางรายวัน</h3>
        </div>
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-2 text-xs text-gray-400 font-medium">วันที่</th>
                <th className="text-right px-4 py-2 text-xs text-gray-400 font-medium">ห้องที่มีแขก</th>
                <th className="text-right px-4 py-2 text-xs text-gray-400 font-medium">ห้องว่าง</th>
                <th className="text-right px-4 py-2 text-xs text-gray-400 font-medium">Occupancy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {days.map((d) => {
                const isToday = d.date.toDateString() === now.toDateString();
                return (
                  <tr key={d.day} className={isToday ? "bg-blue-50" : "hover:bg-gray-50"}>
                    <td className="px-4 py-2 text-gray-700">
                      {d.date.toLocaleDateString("th-TH", {
                        weekday: "short",
                        day: "numeric",
                      })}
                      {isToday && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                          วันนี้
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-gray-900">
                      {d.occupied}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-500">{d.available}</td>
                    <td className="px-4 py-2 text-right">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          d.occPct >= 80
                            ? "bg-red-100 text-red-700"
                            : d.occPct >= 60
                            ? "bg-orange-100 text-orange-700"
                            : d.occPct >= 40
                            ? "bg-amber-100 text-amber-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {d.occPct}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
