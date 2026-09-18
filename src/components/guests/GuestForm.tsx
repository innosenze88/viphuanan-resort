"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { GuestFormState } from "@/app/actions/guests";
import type { Guest } from "@prisma/client";

type Props = {
  action: (prev: GuestFormState, formData: FormData) => Promise<GuestFormState>;
  guest?: Guest;
  submitLabel?: string;
};

const GENDERS = [
  { value: "UNSPECIFIED", label: "ไม่ระบุ" },
  { value: "MALE", label: "ชาย" },
  { value: "FEMALE", label: "หญิง" },
  { value: "OTHER", label: "อื่นๆ" },
];

const ID_TYPES = [
  { value: "", label: "— เลือกประเภท —" },
  { value: "THAI_ID", label: "บัตรประชาชน" },
  { value: "PASSPORT", label: "หนังสือเดินทาง" },
  { value: "DRIVING_LICENSE", label: "ใบขับขี่" },
  { value: "OTHER", label: "อื่นๆ" },
];

export function GuestForm({ action, guest, submitLabel = "บันทึก" }: Props) {
  const router = useRouter();
  const [state, dispatch, pending] = useActionState(action, {});

  useEffect(() => {
    if (state.guestId) {
      router.push(`/guests/${state.guestId}`);
    }
  }, [state.guestId, router]);

  function field(name: string) {
    const errors = state.fieldErrors?.[name];
    return errors ? (
      <p className="text-red-600 text-xs mt-1">{errors[0]}</p>
    ) : null;
  }

  return (
    <form action={dispatch} className="space-y-6">
      {state.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {state.error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">ข้อมูลส่วนตัว</h2>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">คำนำหน้า</label>
            <input
              name="title"
              defaultValue={guest?.title ?? ""}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="นาย / นาง / น.ส."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ *</label>
            <input
              name="firstName"
              defaultValue={guest?.firstName ?? ""}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            {field("firstName")}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">นามสกุล *</label>
            <input
              name="lastName"
              defaultValue={guest?.lastName ?? ""}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            {field("lastName")}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">เพศ</label>
            <select
              name="gender"
              defaultValue={guest?.gender ?? "UNSPECIFIED"}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {GENDERS.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">สัญชาติ</label>
            <input
              name="nationality"
              defaultValue={guest?.nationality ?? "ไทย"}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">วันเกิด</label>
          <input
            type="date"
            name="dateOfBirth"
            defaultValue={
              guest?.dateOfBirth
                ? new Date(guest.dateOfBirth).toISOString().split("T")[0]
                : ""
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">เอกสารยืนยันตัวตน</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ประเภท</label>
            <select
              name="idType"
              defaultValue={guest?.idType ?? ""}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {ID_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">เลขที่</label>
            <input
              name="idNumber"
              defaultValue={guest?.idNumber ?? ""}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="เลขบัตรประชาชน / Passport"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">ข้อมูลติดต่อ</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์</label>
            <input
              name="phone"
              defaultValue={guest?.phone ?? ""}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="0xx-xxx-xxxx"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
            <input
              type="email"
              name="email"
              defaultValue={guest?.email ?? ""}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ที่อยู่</label>
          <textarea
            name="address"
            defaultValue={guest?.address ?? ""}
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
          <textarea
            name="notes"
            defaultValue={guest?.notes ?? ""}
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
          {pending ? "กำลังบันทึก..." : submitLabel}
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
