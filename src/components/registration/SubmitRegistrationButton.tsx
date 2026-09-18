"use client";

import { useTransition, useState } from "react";
import { submitRegistration } from "@/app/actions/registration";

export function SubmitRegistrationButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const [ref, setRef] = useState("");
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);

  function handleSubmit() {
    startTransition(async () => {
      const res = await submitRegistration(id, ref || undefined);
      if (res.error) {
        setError(res.error);
      } else {
        setDone(true);
      }
    });
  }

  if (done) {
    return (
      <div className="text-green-700 text-sm font-medium bg-green-50 border border-green-200 rounded-lg px-4 py-3">
        ✓ บันทึกการส่งแล้ว
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      <div>
        <label className="block text-xs text-gray-500 mb-1">
          เลขที่อ้างอิง (ไม่บังคับ)
        </label>
        <input
          type="text"
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          placeholder="เช่น เลขที่รับแจ้ง / รหัสระบบ ตม."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <button
        onClick={handleSubmit}
        disabled={pending}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-sm px-4 py-2.5 rounded-lg transition-colors"
      >
        {pending ? "กำลังบันทึก..." : "บันทึกการส่ง"}
      </button>
    </div>
  );
}
