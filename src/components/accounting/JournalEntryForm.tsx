"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createJournalEntry } from "@/app/actions/accounting";
import type { JournalFormState } from "@/app/actions/accounting";

type Account = { id: string; code: string; name: string };

type Line = {
  id: number;
  debitAccountId: string;
  creditAccountId: string;
  amount: string;
  description: string;
};

type Props = {
  accounts: Account[];
  defaultBookingId?: string;
};

const initialState: JournalFormState = {};

export function JournalEntryForm({ accounts, defaultBookingId }: Props) {
  const [state, action, pending] = useActionState(createJournalEntry, initialState);
  const router = useRouter();
  const [lines, setLines] = useState<Line[]>([
    { id: 1, debitAccountId: "", creditAccountId: "", amount: "", description: "" },
  ]);

  useEffect(() => {
    if (state.success && state.entryId) {
      router.push(`/accounting/entries/${state.entryId}`);
    }
  }, [state.success, state.entryId, router]);

  function addLine() {
    setLines((prev) => [
      ...prev,
      { id: Date.now(), debitAccountId: "", creditAccountId: "", amount: "", description: "" },
    ]);
  }

  function removeLine(id: number) {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  function updateLine(id: number, field: keyof Line, value: string) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  }

  const totalDebits = lines.reduce(
    (s, l) => s + (l.debitAccountId ? parseFloat(l.amount || "0") : 0),
    0
  );
  const totalCredits = lines.reduce(
    (s, l) => s + (l.creditAccountId ? parseFloat(l.amount || "0") : 0),
    0
  );
  const balanced = Math.abs(totalDebits - totalCredits) < 0.01;

  return (
    <form action={action} className="space-y-5">
      {defaultBookingId && <input type="hidden" name="bookingId" value={defaultBookingId} />}
      <input type="hidden" name="linesJson" value={JSON.stringify(
        lines.map(({ debitAccountId, creditAccountId, amount, description }) => ({
          debitAccountId: debitAccountId || undefined,
          creditAccountId: creditAccountId || undefined,
          amount: parseFloat(amount || "0"),
          description: description || undefined,
        }))
      )} />

      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ประเภท <span className="text-red-500">*</span>
          </label>
          <select
            name="type"
            defaultValue="OTHER"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="REVENUE">รายได้</option>
            <option value="EXPENSE">ค่าใช้จ่าย</option>
            <option value="ADJUSTMENT">ปรับปรุง</option>
            <option value="CORRECTION">แก้ไข</option>
            <option value="OTHER">อื่นๆ</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            วันที่ <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="entryDate"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          คำอธิบาย <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="description"
          placeholder="เช่น รายได้ค่าห้องพัก BK-2026-00001"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {/* Journal Lines */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">รายการ Debit/Credit</label>
          <button
            type="button"
            onClick={addLine}
            className="text-xs text-blue-600 hover:underline"
          >
            + เพิ่มรายการ
          </button>
        </div>

        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 gap-0 bg-gray-50 px-3 py-2 text-xs text-gray-500 uppercase font-medium border-b border-gray-200">
            <div className="col-span-3">Debit บัญชี</div>
            <div className="col-span-3">Credit บัญชี</div>
            <div className="col-span-2">จำนวน</div>
            <div className="col-span-3">รายละเอียด</div>
            <div className="col-span-1"></div>
          </div>

          {lines.map((line) => (
            <div key={line.id} className="grid grid-cols-12 gap-0 px-3 py-2 border-b border-gray-50">
              <div className="col-span-3 pr-2">
                <select
                  value={line.debitAccountId}
                  onChange={(e) => updateLine(line.id, "debitAccountId", e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">—</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.code} {a.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-3 pr-2">
                <select
                  value={line.creditAccountId}
                  onChange={(e) => updateLine(line.id, "creditAccountId", e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">—</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.code} {a.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2 pr-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={line.amount}
                  onChange={(e) => updateLine(line.id, "amount", e.target.value)}
                  placeholder="0.00"
                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-3 pr-2">
                <input
                  type="text"
                  value={line.description}
                  onChange={(e) => updateLine(line.id, "description", e.target.value)}
                  placeholder="รายละเอียด"
                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-1 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => removeLine(line.id)}
                  className="text-gray-300 hover:text-red-500 text-sm"
                >
                  ×
                </button>
              </div>
            </div>
          ))}

          {/* Totals */}
          <div className="grid grid-cols-12 gap-0 px-3 py-2 bg-gray-50 text-xs font-semibold">
            <div className="col-span-3 text-gray-600">รวม Debit: ฿{totalDebits.toFixed(2)}</div>
            <div className="col-span-3 text-gray-600">รวม Credit: ฿{totalCredits.toFixed(2)}</div>
            <div className="col-span-6">
              {!balanced && totalDebits + totalCredits > 0 && (
                <span className="text-red-600">⚠️ ไม่สมดุล ({Math.abs(totalDebits - totalCredits).toFixed(2)})</span>
              )}
              {balanced && totalDebits > 0 && (
                <span className="text-green-600">✓ สมดุล</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending || !balanced || totalDebits === 0}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
      >
        {pending ? "กำลังบันทึก..." : "บันทึกเป็น Draft"}
      </button>
    </form>
  );
}
