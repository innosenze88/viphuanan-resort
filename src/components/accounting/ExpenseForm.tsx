"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createExpense } from "@/app/actions/accounting";
import type { ExpenseFormState } from "@/app/actions/accounting";

const initialState: ExpenseFormState = {};

export function ExpenseForm() {
  const [state, action, pending] = useActionState(createExpense, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);

  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
          บันทึกค่าใช้จ่ายเรียบร้อย
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            วันที่ <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="expenseDate"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ประเภท <span className="text-red-500">*</span>
          </label>
          <select
            name="category"
            defaultValue="OTHER"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="UTILITIES">ค่าสาธารณูปโภค</option>
            <option value="MAINTENANCE">ค่าซ่อมบำรุง</option>
            <option value="SUPPLIES">ค่าวัสดุสิ้นเปลือง</option>
            <option value="STAFFING">ค่าพนักงาน</option>
            <option value="MARKETING">ค่าการตลาด</option>
            <option value="DEPRECIATION">ค่าเสื่อมราคา</option>
            <option value="OTHER">อื่นๆ</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          รายละเอียด <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="description"
          placeholder="เช่น ค่าไฟฟ้าเดือนกันยายน"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        {state.fieldErrors?.description && (
          <p className="text-xs text-red-600 mt-1">{state.fieldErrors.description[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            จำนวนเงิน (฿) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="amount"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          {state.fieldErrors?.amount && (
            <p className="text-xs text-red-600 mt-1">{state.fieldErrors.amount[0]}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ผู้ขาย / ผู้รับเงิน</label>
          <input
            type="text"
            name="vendor"
            placeholder="ชื่อผู้ขาย"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">เลขที่ใบเสร็จ / เอกสารอ้างอิง</label>
        <input
          type="text"
          name="receiptRef"
          placeholder="เลขที่ใบเสร็จ"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
      >
        {pending ? "กำลังบันทึก..." : "บันทึกค่าใช้จ่าย"}
      </button>
    </form>
  );
}
