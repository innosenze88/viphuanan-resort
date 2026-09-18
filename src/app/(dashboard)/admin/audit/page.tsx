import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

const ACTION_BADGE: Record<string, string> = {
  CREATE: "bg-green-100 text-green-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
  ARCHIVE: "bg-gray-100 text-gray-600",
  RESTORE: "bg-teal-100 text-teal-700",
  LOGIN: "bg-indigo-100 text-indigo-700",
  LOGOUT: "bg-indigo-50 text-indigo-500",
  VERIFY: "bg-purple-100 text-purple-700",
  REJECT: "bg-red-100 text-red-700",
  APPROVE: "bg-green-100 text-green-700",
  POST: "bg-yellow-100 text-yellow-700",
  ADJUST: "bg-orange-100 text-orange-700",
  REFUND: "bg-pink-100 text-pink-700",
  EXPORT: "bg-gray-100 text-gray-600",
  CHECKIN: "bg-blue-100 text-blue-700",
  CHECKOUT: "bg-indigo-100 text-indigo-700",
};

const PAGE_SIZE = 50;

export default async function AuditLogPage(props: PageProps<"/admin/audit">) {
  const user = await getSession();
  if (!user) redirect("/login");

  const sp = await props.searchParams;
  const page = sp.page ? Math.max(1, parseInt(sp.page as string)) : 1;
  const entityType = (sp.entity as string) || "";
  const action = (sp.action as string) || "";

  const where: Record<string, unknown> = {};
  if (entityType) where.entityType = entityType;
  if (action) where.action = action;

  const [total, logs] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { name: true } } },
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Distinct entity types for filter
  const entityTypes = await db.auditLog.groupBy({
    by: ["entityType"],
    orderBy: { entityType: "asc" },
  });

  const buildUrl = (params: Record<string, string | number>) => {
    const base: Record<string, string> = {};
    if (entityType) base.entity = entityType;
    if (action) base.action = action;
    Object.assign(base, params);
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(base).map(([k, v]) => [k, String(v)]))
    ).toString();
    return `/admin/audit?${qs}`;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">ประเภท:</span>
          <a
            href="/admin/audit"
            className={`px-2 py-1 rounded-lg text-xs ${!entityType ? "bg-blue-100 text-blue-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}
          >
            ทั้งหมด
          </a>
          {entityTypes.map((e) => (
            <a
              key={e.entityType}
              href={buildUrl({ entity: e.entityType, page: 1 })}
              className={`px-2 py-1 rounded-lg text-xs ${entityType === e.entityType ? "bg-blue-100 text-blue-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}
            >
              {e.entityType}
            </a>
          ))}
        </div>
        <div className="text-xs text-gray-400 ml-auto">
          {total.toLocaleString()} รายการ · หน้า {page}/{totalPages || 1}
        </div>
      </div>

      {/* Log table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-2.5 text-xs text-gray-400 font-medium">เวลา</th>
              <th className="text-left px-4 py-2.5 text-xs text-gray-400 font-medium">ผู้ใช้</th>
              <th className="text-left px-4 py-2.5 text-xs text-gray-400 font-medium">การกระทำ</th>
              <th className="text-left px-4 py-2.5 text-xs text-gray-400 font-medium">ประเภท</th>
              <th className="text-left px-4 py-2.5 text-xs text-gray-400 font-medium">ID</th>
              <th className="text-left px-4 py-2.5 text-xs text-gray-400 font-medium">เหตุผล/หมายเหตุ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {logs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                  ไม่มีข้อมูล
                </td>
              </tr>
            )}
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleDateString("th-TH", {
                    day: "2-digit",
                    month: "short",
                    year: "2-digit",
                  })}
                  <br />
                  <span className="text-gray-400">
                    {new Date(log.createdAt).toLocaleTimeString("th-TH", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-700">
                  {log.user?.name ?? <span className="text-gray-400">ระบบ</span>}
                </td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACTION_BADGE[log.action] ?? "bg-gray-100 text-gray-600"}`}>
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-600">{log.entityType}</td>
                <td className="px-4 py-2.5 text-xs font-mono text-gray-400 max-w-[100px] truncate">
                  {log.entityId.slice(0, 12)}…
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-500 max-w-[200px] truncate">
                  {log.reason ?? (
                    log.afterValue
                      ? JSON.stringify(log.afterValue).slice(0, 60)
                      : "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2 justify-center">
          {page > 1 && (
            <a
              href={buildUrl({ page: page - 1 })}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
            >
              ← ก่อนหน้า
            </a>
          )}
          <span className="text-sm text-gray-500">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <a
              href={buildUrl({ page: page + 1 })}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
            >
              ถัดไป →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
