"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { verifyPayment } from "@/app/actions/payments";

export function VerifyPaymentButton({ paymentId }: { paymentId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleVerify() {
    startTransition(async () => {
      const result = await verifyPayment(paymentId);
      if (result.error) {
        alert(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <button
      onClick={handleVerify}
      disabled={pending}
      className="text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
    >
      {pending ? "กำลังยืนยัน..." : "ยืนยัน"}
    </button>
  );
}
