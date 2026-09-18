import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { saveSystemSettings } from "@/app/actions/admin";

const SETTING_KEYS = [
  { key: "resort_name", label: "ชื่อรีสอร์ท (ภาษาไทย)", placeholder: "วิภวนา รีสอร์ท" },
  { key: "resort_name_en", label: "ชื่อรีสอร์ท (ภาษาอังกฤษ)", placeholder: "Viphuanan Resort" },
  { key: "resort_address", label: "ที่อยู่", placeholder: "เลขที่ ... ตำบล ... อำเภอ ... จังหวัด ..." },
  { key: "resort_phone", label: "โทรศัพท์", placeholder: "0XX-XXX-XXXX" },
  { key: "resort_tax_id", label: "เลขประจำตัวผู้เสียภาษี", placeholder: "X-XXXX-XXXXX-XX-X" },
];

async function saveAction(formData: FormData): Promise<void> {
  "use server";
  await saveSystemSettings(formData);
}

export default async function AdminPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const [settings, userCount, roomCount, auditCount] = await Promise.all([
    db.systemSetting.findMany({ where: { key: { in: SETTING_KEYS.map((s) => s.key) } } }),
    db.user.count({ where: { active: true } }),
    db.room.count({ where: { active: true } }),
    db.auditLog.count(),
  ]);

  const settingMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  return (
    <div className="space-y-6">
      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{userCount}</div>
          <div className="text-xs text-gray-500 mt-0.5">ผู้ใช้งานที่เปิดใช้งาน</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{roomCount}</div>
          <div className="text-xs text-gray-500 mt-0.5">ห้องพักที่ใช้งาน</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{auditCount.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-0.5">รายการ Audit Log</div>
        </div>
      </div>

      {/* System settings form */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">ข้อมูลรีสอร์ท</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            ข้อมูลนี้จะปรากฏบนใบกำกับภาษีและใบเสร็จรับเงิน
          </p>
        </div>
        <form action={saveAction} className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SETTING_KEYS.map((s) => (
              <div key={s.key}>
                <label className="block text-xs font-medium text-gray-700 mb-1">{s.label}</label>
                <input
                  name={s.key}
                  type="text"
                  defaultValue={settingMap[s.key] ?? ""}
                  placeholder={s.placeholder}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-5 py-2 transition-colors"
            >
              บันทึก
            </button>
          </div>
        </form>
      </div>

      {/* Info panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <div className="font-semibold mb-1">ข้อมูลระบบ</div>
        <div className="text-xs space-y-0.5 text-blue-700">
          <div>Session: <span className="font-mono">{user.name}</span> ({user.role})</div>
          <div>Email: <span className="font-mono">{user.email}</span></div>
        </div>
      </div>
    </div>
  );
}
