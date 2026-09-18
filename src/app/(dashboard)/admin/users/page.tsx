import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { createUser } from "@/app/actions/admin";
import { ToggleActiveButton, RoleSelect } from "@/components/admin/AdminToggleButton";

const ROLE_BADGE: Record<string, string> = {
  OWNER: "bg-purple-100 text-purple-800",
  MANAGER: "bg-blue-100 text-blue-800",
  FRONT_DESK: "bg-green-100 text-green-800",
  ACCOUNTING: "bg-yellow-100 text-yellow-800",
  HOUSEKEEPING: "bg-orange-100 text-orange-800",
};

async function createUserAction(formData: FormData): Promise<void> {
  "use server";
  await createUser(formData);
}

export default async function AdminUsersPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const users = await db.user.findMany({
    orderBy: [{ active: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  const isOwner = user.role === "OWNER";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User list */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">ผู้ใช้งานทั้งหมด ({users.length})</h3>
            {!isOwner && (
              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                ต้องการสิทธิ์ OWNER เพื่อแก้ไข
              </span>
            )}
          </div>
          <div className="divide-y divide-gray-50">
            {users.map((u) => (
              <div key={u.id} className={`px-5 py-4 ${!u.active ? "opacity-50" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 text-sm">{u.name}</span>
                      {u.id === user.id && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">คุณ</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE[u.role] ?? "bg-gray-100 text-gray-600"}`}>
                        {u.role}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{u.email}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      เข้าสู่ระบบล่าสุด:{" "}
                      {u.lastLoginAt
                        ? new Date(u.lastLoginAt).toLocaleDateString("th-TH")
                        : "ยังไม่เคย"}
                    </div>
                  </div>
                  {isOwner && u.id !== user.id && (
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      <RoleSelect userId={u.id} currentRole={u.role} />
                      <ToggleActiveButton id={u.id} active={u.active} type="user" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Create user form */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden h-fit">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">เพิ่มผู้ใช้ใหม่</h3>
          </div>
          {!isOwner ? (
            <div className="p-5 text-sm text-gray-500">
              เฉพาะ OWNER เท่านั้นที่สามารถเพิ่มผู้ใช้งานได้
            </div>
          ) : (
            <form action={createUserAction} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">ชื่อ-นามสกุล *</label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="ชื่อพนักงาน"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">อีเมล *</label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="email@example.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">รหัสผ่าน * (อย่างน้อย 8 ตัว)</label>
                <input
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">บทบาท</label>
                <select
                  name="role"
                  defaultValue="FRONT_DESK"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="OWNER">OWNER — เจ้าของ</option>
                  <option value="MANAGER">MANAGER — ผู้จัดการ</option>
                  <option value="FRONT_DESK">FRONT_DESK — พนักงานต้อนรับ</option>
                  <option value="ACCOUNTING">ACCOUNTING — บัญชี</option>
                  <option value="HOUSEKEEPING">HOUSEKEEPING — แม่บ้าน</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
              >
                เพิ่มผู้ใช้
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
