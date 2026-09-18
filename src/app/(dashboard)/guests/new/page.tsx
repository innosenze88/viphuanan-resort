import { GuestForm } from "@/components/guests/GuestForm";
import { createGuest } from "@/app/actions/guests";

export default function NewGuestPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">เพิ่มแขกใหม่</h1>
      <GuestForm action={createGuest} submitLabel="บันทึกแขก" />
    </div>
  );
}
