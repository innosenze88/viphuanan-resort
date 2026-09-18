"use client";

import { useActionState, useEffect } from "react";
import { recordPayment } from "@/app/actions/payments";
import type { PaymentFormState } from "@/app/actions/payments";
import { useRouter } from "next/navigation";

const initialState: PaymentFormState = {};

type Props = {
  bookingId: string;
  grossAmount: number;
  totalPaid: number;
};

export function RecordPaymentForm({ bookingId, grossAmount, totalPaid }: Props) {
  const [state, action, pending] = useActionState(recordPayment, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  const outstanding = Math.max(0, grossAmount - totalPaid);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="bookingId" value={bookingId} />

      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
          บันทึกการชำระเงินเรียบร้อย
        </div>
      )}

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
            defaultValue={outstanding > 0 ? outstanding.toFixed(2) : ""}
            placeholder="0.00"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          {state.fieldErrors?.amount && (
            <p className="text-xs text-red-600 mt-1">{state.fieldErrors.amount[0]}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            วิธีชำระ <span className="text-red-500">*</span>
          </label>
          <select
            name="method"
            defaultValue="CASH"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="CASH">เงินสด</option>
            <option value="BANK_TRANSFER">โอนธนาคาร</option>
            <option value="PROMPTPAY">พร้อมเพย์</option>
            <option value="PAYMENT_GATEWAY">Payment Gateway</option>
            <option value="OTA">OTA</option>
            <option value="OTHER">อื่นๆ</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ประเภทการชำระ <span className="text-red-500">*</span>
          </label>
          <select
            name="purpose"
            defaultValue={totalPaid === 0 ? "DEPOSIT" : "BALANCE"}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="DEPOSIT">มัดจำ</option>
            <option value="BALANCE">ชำระส่วนที่เหลือ</option>
            <option value="FULL">ชำระเต็มจำนวน</option>
            <option value="EXTRA_CHARGE">ค่าใช้จ่ายเพิ่มเติม</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            วันที่ชำระ
          </label>
          <input
            type="datetime-local"
            name="paidAt"
            defaultValue={new Date().toISOString().slice(0, 16)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          เลขอ้างอิง (slip / transfer ref)
        </label>
        <input
          type="text"
          name="transactionRef"
          placeholder="เช่น TXN123456"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
        <textarea
          name="notes"
          rows={2}
          placeholder="หมายเหตุเพิ่มเติม"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
      >
        {pending ? "กำลังบันทึก..." : "บันทึกการชำระเงิน"}
      </button>
    </form>
  );
}
