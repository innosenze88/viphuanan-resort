import Link from "next/link";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";

const SOURCE_LABEL: Record<string, string> = {
  DIRECT: "ตรง / Direct",
  WALK_IN: "Walk-in",
  PHONE: "โทรศัพท์",
  WEBSITE: "เว็บไซต์",
  BOOKING_COM: "Booking.com",
  AGODA: "Agoda",
  OTHER_OTA: "OTA อื่นๆ",
  OTHER: "อื่นๆ",
};

export default async function RevenueBySourcePage(
  props: PageProps<"/reports/revenue">
) {
  const sp = await props.searchParams;
  const now = new Date();

  // Year filter (default: current year)
  const year = sp.year ? parseInt(sp.year as string) : now.getFullYear();
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);

  const prevYear = year - 1;
  const nextYear = year + 1;

  // Fetch all CHECKED_OUT bookings in the selected year
  const bookings = await db.booking.findMany({
    where: {
      status: "CHECKED_OUT",
      checkOutDate: { gte: yearStart, lt: yearEnd },
    },
    select: {
      source: true,
      grossAmount: true,
      numberOfNights: true,
      checkOutDate: true,
    },
  });

  const totalRevenue = bookings.reduce((s, b) => s + Number(b.grossAmount), 0);
  const totalNights = bookings.reduce((s, b) => s + b.numberOfNights, 0);

  // By source
  const bySource: Record<string, { count: number; nights: number; revenue: number }> = {};
  for (const b of bookings) {
    if (!bySource[b.source]) bySource[b.source] = { count: 0, nights: 0, revenue: 0 };
    bySource[b.source].count++;
    bySource[b.source].nights += b.numberOfNights;
    bySource[b.source].revenue += Number(b.grossAmount);
  }
  const sortedSources = Object.entries(bySource).sort(([, a], [, b]) => b.revenue - a.revenue);

  // By month (for trend bar chart as text)
  const byMonth: Record<number, { revenue: number; nights: number; count: number }> = {};
  for (let m = 1; m <= 12; m++) byMonth[m] = { revenue: 0, nights: 0, count: 0 };
  for (const b of bookings) {
    const m = new Date(b.checkOutDate).getMonth() + 1;
    byMonth[m].revenue += Number(b.grossAmount);
    byMonth[m].nights += b.numberOfNights;
    byMonth[m].count++;
  }

  const maxMonthRevenue = Math.max(...Object.values(byMonth).map((m) => m.revenue), 1);

  const MONTH_NAMES = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

  return (
    <div className="space-y-6">
      {/* Year nav */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/reports/revenue?year=${prevYear}`}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
          >
            ←
          </Link>
          <h2 className="text-lg font-bold text-gray-900">รายได้ปี {year + 543}</h2>
          <Link
            href={`/reports/revenue?year=${nextYear}`}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
          >
            →
          </Link>
        </div>
        <div className="text-xs text-gray-400">{bookings.length} การจอง · {totalNights} คืน</div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border-2 border-green-200 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide">รายได้รวมปีนี้</div>
          <div className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(totalRevenue)}</div>
          <div className="text-xs text-gray-400 mt-1">{bookings.length} การจอง</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide">ราคาเฉลี่ย (ADR)</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {formatCurrency(totalNights > 0 ? totalRevenue / totalNights : 0)}
          </div>
          <div className="text-xs text-gray-400 mt-1">ต่อคืน</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide">แหล่งที่มาหลัก</div>
          <div className="text-xl font-bold text-gray-900 mt-1">
            {sortedSources.length > 0
              ? SOURCE_LABEL[sortedSources[0][0]] ?? sortedSources[0][0]
              : "—"}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {sortedSources.length > 0
              ? `${Math.round((sortedSources[0][1].revenue / (totalRevenue || 1)) * 100)}% ของรายได้`
              : "ยังไม่มีข้อมูล"}
          </div>
        </div>
      </div>

      {/* Monthly bar chart (text-based) */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 text-sm mb-4">รายได้รายเดือน</h3>
        <div className="space-y-2">
          {MONTH_NAMES.map((name, i) => {
            const m = i + 1;
            const data = byMonth[m];
            const pct = maxMonthRevenue > 0
              ? Math.round((data.revenue / maxMonthRevenue) * 100)
              : 0;
            const isCurrent = m === now.getMonth() + 1 && year === now.getFullYear();
            return (
              <div key={m} className="flex items-center gap-3">
                <div className="text-xs text-gray-500 w-8 text-right">{name}</div>
                <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isCurrent ? "bg-blue-500" : "bg-green-400"
                    }`}
                    style={{ width: `${Math.max(pct, data.revenue > 0 ? 2 : 0)}%` }}
                  />
                </div>
                <div className="text-xs text-gray-700 w-24 text-right font-medium">
                  {data.revenue > 0 ? formatCurrency(data.revenue) : "—"}
                </div>
                <Link
                  href={`/reports?year=${year}&month=${m}`}
                  className="text-xs text-blue-600 hover:underline w-8"
                >
                  {data.count > 0 ? `${data.count}ห้` : ""}
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* By source table */}
      {sortedSources.length === 0 ? (
        <div className="text-center py-10 text-gray-400">ไม่มีข้อมูลสำหรับปีนี้</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">แยกตามแหล่งที่มา</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left px-4 py-2 text-xs text-gray-400 font-medium">แหล่งที่มา</th>
                <th className="text-right px-4 py-2 text-xs text-gray-400 font-medium">จำนวนจอง</th>
                <th className="text-right px-4 py-2 text-xs text-gray-400 font-medium">คืนรวม</th>
                <th className="text-right px-4 py-2 text-xs text-gray-400 font-medium">ADR</th>
                <th className="text-right px-4 py-2 text-xs text-gray-400 font-medium">รายได้</th>
                <th className="px-4 py-2 text-xs text-gray-400 font-medium">สัดส่วน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedSources.map(([source, d]) => {
                const pct = totalRevenue > 0
                  ? Math.round((d.revenue / totalRevenue) * 100)
                  : 0;
                const adr = d.nights > 0 ? d.revenue / d.nights : 0;
                return (
                  <tr key={source} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-800 font-medium">
                      {SOURCE_LABEL[source] ?? source}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{d.count}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{d.nights}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(adr)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {formatCurrency(d.revenue)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-blue-400 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-200">
                <td className="px-4 py-3 font-semibold text-gray-700">รวมทั้งหมด</td>
                <td className="px-4 py-3 text-right font-medium text-gray-700">{bookings.length}</td>
                <td className="px-4 py-3 text-right font-medium text-gray-700">{totalNights}</td>
                <td className="px-4 py-3 text-right font-medium text-gray-700">
                  {formatCurrency(totalNights > 0 ? totalRevenue / totalNights : 0)}
                </td>
                <td className="px-4 py-3 text-right font-bold text-gray-900">
                  {formatCurrency(totalRevenue)}
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
