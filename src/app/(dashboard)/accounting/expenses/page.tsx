import { db } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ExpenseForm } from "@/components/accounting/ExpenseForm";

const CAT_LABEL: Record<string, string> = {
  UTILITIES: "สาธารณูปโภค",
  MAINTENANCE: "ซ่อมบำรุง",
  SUPPLIES: "วัสดุสิ้นเปลือง",
  STAFFING: "พนักงาน",
  MARKETING: "การตลาด",
  DEPRECIATION: "ค่าเสื่อมราคา",
  OTHER: "อื่นๆ",
};

export default async function ExpensesPage() {
  const expenses = await db.expense.findMany({
    orderBy: { expenseDate: "desc" },
    take: 100,
  });

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + Number(e.amount);
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide">ค่าใช้จ่ายรวม</div>
          <div className="text-2xl font-bold text-red-700 mt-1">{formatCurrency(totalExpenses)}</div>
          <div className="text-xs text-gray-400 mt-1">{expenses.length} รายการ</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">แยกตามประเภท</div>
          <div className="space-y-1">
            {Object.entries(byCategory).map(([cat, amt]) => (
              <div key={cat} className="flex justify-between text-xs">
                <span className="text-gray-500">{CAT_LABEL[cat] ?? cat}</span>
                <span className="font-medium">{formatCurrency(amt)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* New expense form */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">บันทึกค่าใช้จ่ายใหม่</h2>
        <ExpenseForm />
      </div>

      {/* Expense list */}
      {expenses.length === 0 ? (
        <div className="text-center py-8 text-gray-400">ยังไม่มีค่าใช้จ่ายที่บันทึก</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase font-medium">วันที่</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase font-medium">ประเภท</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase font-medium">รายละเอียด</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase font-medium">ผู้ขาย</th>
                <th className="text-right px-4 py-3 text-xs text-gray-500 uppercase font-medium">จำนวน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{formatDate(e.expenseDate)}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {CAT_LABEL[e.category] ?? e.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{e.description}</td>
                  <td className="px-4 py-3 text-gray-500">{e.vendor ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold text-red-700">
                    {formatCurrency(Number(e.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-200">
                <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-gray-700 text-right">รวม</td>
                <td className="px-4 py-3 text-right font-bold text-red-700">{formatCurrency(totalExpenses)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
