"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { BookingFormState } from "@/app/actions/bookings";
import type { Room, Guest } from "@prisma/client";

type Props = {
  action: (prev: BookingFormState, formData: FormData) => Promise<BookingFormState>;
  rooms: Room[];
  guests: Guest[];
  defaultGuestId?: string;
};

const SOURCES = [
  { value: "DIRECT", label: "Direct" },
  { value: "WALK_IN", label: "Walk-in" },
  { value: "PHONE", label: "โทรศัพท์" },
  { value: "WEBSITE", label: "เว็บไซต์" },
  { value: "BOOKING_COM", label: "Booking.com" },
  { value: "AGODA", label: "Agoda" },
  { value: "OTHER_OTA", label: "OTA อื่นๆ" },
  { value: "OTHER", label: "อื่นๆ" },
];

export function BookingForm({ action, rooms, guests, defaultGuestId }: Props) {
  const router = useRouter();
  const [state, dispatch, pending] = useActionState(action, {});

  useEffect(() => {
    if (state.bookingId) {
      router.push(`/bookings/${state.bookingId}`);
    }
  }, [state.bookingId, router]);

  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  return (
    <form action={dispatch} className="space-y-6 max-w-2xl">
      {state.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {state.error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">ข้อมูลการจอง</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">แขก *</label>
          <select
            name="guestId"
            defaultValue={defaultGuestId ?? ""}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">— เลือกแขก —</option>
            {guests.map((g) => (
              <option key={g.id} value={g.id}>{g.fullName} {g.phone ? `(${g.phone})` : ""}</option>
            ))}
          </select>
          {state.fieldErrors?.guestId && (
            <p className="text-red-600 text-xs mt-1">{state.fieldErrors.guestId[0]}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ห้องพัก *</label>
          <select
            name="roomId"
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">— เลือกห้อง —</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                ห้อง {r.roomNumber} — ฿{Number(r.basePrice).toLocaleString("th-TH")} ({r.status})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ช่องทางการจอง</label>
          <select
            name="source"
            defaultValue="DIRECT"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            {SOURCES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">วันที่และราคา</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">เช็คอิน *</label>
            <input
              type="date"
              name="checkInDate"
              defaultValue={today}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">เช็คเอาท์ *</label>
            <input
              type="date"
              name="checkOutDate"
              defaultValue={tomorrow}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ราคา/คืน (บาท) *</label>
            <input
              type="number"
              name="roomRate"
              min="0"
              step="1"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="1200"
            />
            {state.fieldErrors?.roomRate && (
              <p className="text-red-600 text-xs mt-1">{state.fieldErrors.roomRate[0]}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ส่วนลด (บาท)</label>
            <input
              type="number"
              name="discount"
              min="0"
              step="1"
              defaultValue="0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
          <textarea
            name="notes"
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition-colors"
        >
          {pending ? "กำลังสร้างการจอง..." : "สร้างการจอง"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium px-6 py-2.5 rounded-lg text-sm transition-colors"
        >
          ยกเลิก
        </button>
      </div>
    </form>
  );
}
