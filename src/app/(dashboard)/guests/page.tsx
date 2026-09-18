import Link from "next/link";
import { db } from "@/lib/db";

export default async function GuestsPage(props: PageProps<"/guests">) {
  const { q } = await props.searchParams as { q?: string };

  const guests = await db.guest.findMany({
    where: {
      active: true,
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { fullName: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
              { idNumber: { contains: q } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      _count: { select: { bookings: true } },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">แขก</h1>
          <p className="text-gray-500 text-sm mt-1">{guests.length} รายการ</p>
        </div>
        <Link
          href="/guests/new"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + เพิ่มแขกใหม่
        </Link>
      </div>

      {/* Search */}
      <form method="GET" className="mb-4">
        <input
          name="q"
          defaultValue={q}
          placeholder="ค้นหาชื่อ, เบอร์โทร, เลขบัตร..."
          className="w-full max-w-md border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </form>

      {guests.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {q ? `ไม่พบแขกที่ค้นหา "${q}"` : "ยังไม่มีข้อมูลแขก"}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3">ชื่อ-นามสกุล</th>
                <th className="px-4 py-3">เบอร์โทร</th>
                <th className="px-4 py-3">สัญชาติ</th>
                <th className="px-4 py-3">การจอง</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {guests.map((g) => (
                <tr key={g.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{g.fullName}</div>
                    {g.idNumber && (
                      <div className="text-xs text-gray-400">{g.idNumber}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{g.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{g.nationality ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{g._count.bookings}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/guests/${g.id}`}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      ดูรายละเอียด
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
