"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { verifyDocument, rejectDocument } from "@/app/actions/documents";

export function VerifyDocumentButton({ documentId }: { documentId: string }) {
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState("");
  const router = useRouter();

  function handleVerify() {
    startTransition(async () => {
      const result = await verifyDocument(documentId, notes || undefined);
      if (result.error) {
        alert(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="หมายเหตุ (ถ้ามี)"
        className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      />
      <button
        onClick={handleVerify}
        disabled={pending}
        className="px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
      >
        {pending ? "กำลังยืนยัน..." : "ยืนยันเอกสาร"}
      </button>
    </div>
  );
}

export function RejectDocumentButton({ documentId }: { documentId: string }) {
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function handleReject() {
    if (!reason.trim()) {
      alert("กรุณาระบุเหตุผลการปฏิเสธ");
      return;
    }
    startTransition(async () => {
      const result = await rejectDocument(documentId, reason);
      if (result.error) {
        alert(result.error);
      } else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-sm font-medium rounded-lg transition-colors"
      >
        ปฏิเสธ
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="เหตุผลการปฏิเสธ *"
        className="flex-1 px-3 py-1.5 border border-red-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        autoFocus
      />
      <button
        onClick={handleReject}
        disabled={pending}
        className="px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
      >
        {pending ? "กำลังดำเนินการ..." : "ยืนยันการปฏิเสธ"}
      </button>
      <button
        onClick={() => setOpen(false)}
        className="px-3 py-1.5 text-gray-500 hover:text-gray-700 text-sm"
      >
        ยกเลิก
      </button>
    </div>
  );
}
