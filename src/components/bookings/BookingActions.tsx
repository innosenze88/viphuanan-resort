"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkIn, checkOut } from "@/app/actions/bookings";

export function CheckInButton({ bookingId }: { bookingId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const result = await checkIn(bookingId);
      if (result.error) {
        alert(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
    >
      {pending ? "กำลังเช็คอิน..." : "เช็คอิน ✓"}
    </button>
  );
}

export function CheckOutButton({ bookingId }: { bookingId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const result = await checkOut(bookingId);
      if (result.error) {
        alert(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
    >
      {pending ? "กำลังเช็คเอาท์..." : "เช็คเอาท์ →"}
    </button>
  );
}
