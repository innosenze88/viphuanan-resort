import Link from "next/link";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { getSession } from "@/lib/auth/session";

const EXPENSE_LABEL: Record<string, string> = {
  UTILITIES: "สาธารณูปโภค",
  MAINTENANCE: "ซ่อมบำรุง",
  SUPPLIES: "วัสดุสิ้นเปลือง",
  STAFFING: "พนักงาน",
  MARKETING: "การตลาด",
  DEPRECIATION: "ค่าเสื่อมราคา",
  OTHER: "อื่นๆ",
};

const SOURCE_LABEL: Record<string, string> = {
  DIRECT: "ตรง",
  WALK_IN: "Walk-in",
  PHONE: "โทรศัพท์",
  WEBSITE: "เว็บไซต์",
  BOOKING_COM: "Booking.com",
  AGODA: "Agoda",
  OTHER_OTA: "OTA อื่นๆ",
  OTHER: "อื่นๆ",
};

function monthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
}

export default async function ReportsPnLPage(
  props: PageProps<"/reports">
) {
  await getSession(); // auth guard handled by layout

  const sp = await props.searchParams;
  const now = new Date();
  const year = sp.year ? parseInt(sp.year as string) : now.getFullYear();
  const month = sp.month ? parseInt(sp.month as string) : now.getMonth() + 1;

  const { start, end } = monthRange(year, month);

  // Previous / next month links
  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };

  const monthLabel = start.toLocaleDateString("th-TH", { year: "numeric", month: "long" });

  // ── Data (all queries in parallel) ───────────────────────────────────────
  const [checkedOutBookings, expenses, totalRooms] = await Promise.all([
    // Revenue: CHECKED_OUT bookings whose checkOutDate falls in this month
    db.booking.findMany({
      where: {
        status: "CHECKED_OUT",
        checkOutDate: { gte: start, lt: end },
      },
      select: {
        id: true,
        bookingReference: true,
        grossAmount: true,
        numberOfNights: true,
        source: true,
        roomRate: true,
        discount: true,
        checkInDate: true,
        checkOutDate: true,
        guest: { select: { fullName: true } },
        room: { select: { roomNumber: true } },
      },
      orderBy: { checkOutDate: "asc" },
    }),
    // Expenses for the month
    db.expense.findMany({
      where: { expenseDate: { gte: start, lt: end } },
      select: { category: true, amount: true, description: true, vendor: true },
    }),
    // Total rooms for occupancy calculation
    db.room.count({ where: { active: true } }),
  ]);

  // ── Revenue calculations ──────────────────────────────────────────────────
  const totalRevenue = checkedOutBookings.reduce(
    (s, b) => s + Number(b.grossAmount),
    0
  );
  const totalNights = checkedOutBookings.reduce(
    (s, b) => s + b.numberOfNights,
    0
  );
  const daysInMonth = new Date(year, month, 0).getDate();
  const availableRoomNights = totalRooms * daysInMonth;
  const adr = totalNights > 0 ? totalRevenue / totalNights : 0;
  const occupancyPct = availableRoomNights > 0
    ? Math.round((totalNights / availableRoomNights) * 100)
    : 0;
  const revPar = adr * (occupancyPct / 100);

  // ── Expense calculations ───────────────────────────────────────────────────
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const netProfit = totalRevenue - totalExpenses;

  const expenseByCategory: Record<string, number> = {};
  for (const e of expenses) {
    expenseByCategory[e.category] =
      (expenseByCategory[e.category] ?? 0) + Number(e.amount);
  }

  // ── Revenue by source ──────────────────────────────────────────────────────
  const revenueBySource: Record<string, { count: number; nights: number; revenue: number }> = {};
  for (const b of checkedOutBookings) {
    const s = b.source;
    if (!revenueBySource[s]) revenueBySource[s] = { count: 0, nights: 0, revenue: 0 };
    revenueBySource[s].count++;
    revenueBySource[s].nights += b.numberOfNights;
    revenueBySource[s].revenue += Number(b.grossAmount);
  }
  const sortedSources = Object.entries(revenueBySource).sort(
    ([, a], [, b]) => b.revenue - a.revenue
  );

  // ── 12-month trend (for the "history" table) ──────────────────────────────
  const trendMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(year, month - 1 - i, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }).reverse();

  const trendData = await Promise.all(
    trendMonths.map(async ({ year: y, month: m }) => {
      const { start: s, end: e } = monthRange(y, m);
      const [rev, exp] = await Promise.all([
        db.booking.aggregate({
          where: { status: "CHECKED_OUT", checkOutDate: { gte: s, lt: e } },
          _sum: { grossAmount: true },
          _count: true,
        }),
        db.expense.aggregate({
          where: { expenseDate: { gte: s, lt: e } },
          _sum: { amount: true },
        }),
      ]);
      return {
        year: y,
        month: m,
        label: s.toLocaleDateString("th-TH", { month: "short", year: "numeric" }),
        revenue: Number(rev._sum.grossAmount ?? 0),
        bookings: rev._count,
        expenses: Number(exp._sum.amount ?? 0),
      };
    })
  );

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  return (
    <div className="space-y-6">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/reports?year=${prev.y}&month=${prev.m}`}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
          >
            ←
          </Link>
          <h2 className="text-lg font-bold text-gray-900">{monthLabel}</h2>
          <Link
            href={`/reports?year=${next.y}&month=${next.m}`}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
          >
            →
          </Link>
          {!isCurrentMonth && (
            <Link
              href="/reports"
              className="text-sm text-blue-600 hover:underline"
            >
              กลับเดือนนี้
            </Link>
          )}
        </div>
        <div className="text-xs text-gray-400">
          คำนวณจากการ check-out ในเดือนนี้ ({checkedOutBookings.length} ห้อง)
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="รายได้รวม"
          value={formatCurrency(totalRevenue)}
          sub={`${checkedOutBookings.length} การจอง`}
          color="text-green-700"
          border="border-green-200"
        />
        <KpiCard
          label="Occupancy"
          value={`${occupancyPct}%`}
          sub={`${totalNights} คืน / ${availableRoomNights} คืนที่มี`}
          color="text-blue-700"
          border="border-blue-200"
        />
        <KpiCard
          label="ADR"
          value={formatCurrency(adr)}
          sub="ราคาเฉลี่ยต่อคืน"
          color="text-indigo-700"
          border="border-indigo-200"
        />
        <KpiCard
          label="RevPAR"
          value={formatCurrency(revPar)}
          sub="รายได้ต่อห้องที่มี"
          color="text-violet-700"
          border="border-violet-200"
        />
      </div>

      {/* P&L statement */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Revenue section */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-green-50 border-b border-green-100">
            <h3 className="font-semibold text-green-900 text-sm">รายได้ (Revenue)</h3>
          </div>
          {checkedOutBookings.length === 0 ? (
            <div className="px-5 py-6 text-center text-gray-400 text-sm">
              ไม่มีรายได้ในเดือนนี้
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {checkedOutBookings.map((b) => (
                <div key={b.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-gray-50">
                  <div>
                    <div className="text-sm text-gray-900">{b.guest.fullName}</div>
                    <div className="text-xs text-gray-400">
                      ห้อง {b.room.roomNumber} · {b.numberOfNights} คืน ·{" "}
                      <Link href={`/bookings/${b.id}`} className="hover:underline font-mono">
                        {b.bookingReference}
                      </Link>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(Number(b.grossAmount))}
                    </div>
                    <Link
                      href={`/reports/print/tax-invoice/${b.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      ใบกำกับภาษี →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="px-4 py-3 bg-green-50 border-t border-green-100 flex justify-between">
            <span className="text-sm font-semibold text-green-900">รวมรายได้</span>
            <span className="text-sm font-bold text-green-700">{formatCurrency(totalRevenue)}</span>
          </div>
        </div>

        {/* Expenses section */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-red-50 border-b border-red-100">
            <h3 className="font-semibold text-red-900 text-sm">ค่าใช้จ่าย (Expenses)</h3>
          </div>
          {Object.entries(expenseByCategory).length === 0 ? (
            <div className="px-5 py-6 text-center text-gray-400 text-sm">
              ไม่มีค่าใช้จ่ายในเดือนนี้
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {Object.entries(expenseByCategory).map(([cat, amt]) => (
                <div key={cat} className="px-4 py-2.5 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    {EXPENSE_LABEL[cat] ?? cat}
                  </div>
                  <div className="text-sm font-medium text-red-700">
                    {formatCurrency(amt)}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="px-4 py-3 bg-red-50 border-t border-red-100 flex justify-between">
            <span className="text-sm font-semibold text-red-900">รวมค่าใช้จ่าย</span>
            <span className="text-sm font-bold text-red-700">{formatCurrency(totalExpenses)}</span>
          </div>
        </div>
      </div>

      {/* Net profit banner */}
      <div
        className={`rounded-xl border p-5 flex items-center justify-between ${
          netProfit >= 0
            ? "bg-green-50 border-green-200"
            : "bg-red-50 border-red-200"
        }`}
      >
        <div>
          <div className="text-sm font-medium text-gray-700">
            กำไร / ขาดทุนสุทธิ {monthLabel}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            รายได้ {formatCurrency(totalRevenue)} − ค่าใช้จ่าย {formatCurrency(totalExpenses)}
          </div>
        </div>
        <div
          className={`text-3xl font-bold ${
            netProfit >= 0 ? "text-green-700" : "text-red-700"
          }`}
        >
          {netProfit >= 0 ? "+" : ""}
          {formatCurrency(netProfit)}
        </div>
      </div>

      {/* Revenue by source */}
      {sortedSources.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">รายได้ตามแหล่งที่มา</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left px-4 py-2 text-xs text-gray-400 font-medium">แหล่งที่มา</th>
                <th className="text-right px-4 py-2 text-xs text-gray-400 font-medium">จำนวนจอง</th>
                <th className="text-right px-4 py-2 text-xs text-gray-400 font-medium">คืน</th>
                <th className="text-right px-4 py-2 text-xs text-gray-400 font-medium">รายได้</th>
                <th className="text-right px-4 py-2 text-xs text-gray-400 font-medium">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedSources.map(([source, d]) => (
                <tr key={source} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-700 font-medium">
                    {SOURCE_LABEL[source] ?? source}
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-600">{d.count}</td>
                  <td className="px-4 py-2.5 text-right text-gray-600">{d.nights}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                    {formatCurrency(d.revenue)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-500">
                    {totalRevenue > 0
                      ? `${Math.round((d.revenue / totalRevenue) * 100)}%`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 6-month trend */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">แนวโน้ม 6 เดือนล่าสุด</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50">
              <th className="text-left px-4 py-2 text-xs text-gray-400 font-medium">เดือน</th>
              <th className="text-right px-4 py-2 text-xs text-gray-400 font-medium">จำนวนจอง</th>
              <th className="text-right px-4 py-2 text-xs text-gray-400 font-medium">รายได้</th>
              <th className="text-right px-4 py-2 text-xs text-gray-400 font-medium">ค่าใช้จ่าย</th>
              <th className="text-right px-4 py-2 text-xs text-gray-400 font-medium">กำไรสุทธิ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {trendData.map((t) => {
              const net = t.revenue - t.expenses;
              const isSelected = t.year === year && t.month === month;
              return (
                <tr
                  key={`${t.year}-${t.month}`}
                  className={isSelected ? "bg-blue-50" : "hover:bg-gray-50"}
                >
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/reports?year=${t.year}&month=${t.month}`}
                      className={`hover:underline ${isSelected ? "font-semibold text-blue-700" : "text-gray-700"}`}
                    >
                      {t.label}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-600">{t.bookings}</td>
                  <td className="px-4 py-2.5 text-right text-gray-900 font-medium">
                    {formatCurrency(t.revenue)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-red-700">
                    {formatCurrency(t.expenses)}
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right font-semibold ${
                      net >= 0 ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {net >= 0 ? "+" : ""}
                    {formatCurrency(net)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  color,
  border,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
  border: string;
}) {
  return (
    <div className={`bg-white rounded-xl border-2 ${border} p-4`}>
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-1">{sub}</div>
    </div>
  );
}
