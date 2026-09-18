"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import {
  submitJournal,
  verifyJournal,
  approveJournal,
  postJournal,
  createReversal,
} from "@/app/actions/accounting";
import type { JournalStatus } from "@prisma/client";

type Props = {
  entryId: string;
  status: JournalStatus;
  createdBy: string | null;
  currentUserId: string;
  currentUserRole: string;
};

export function JournalWorkflowButtons({
  entryId,
  status,
  currentUserRole,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function act(fn: () => Promise<{ error?: string; reversalId?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
        if ("reversalId" in result && result.reversalId) {
          router.push(`/accounting/entries/${result.reversalId}`);
        }
      }
    });
  }

  const canAccounting = ["OWNER", "MANAGER", "ACCOUNTING"].includes(currentUserRole);
  const canManager = ["OWNER", "MANAGER"].includes(currentUserRole);

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {status === "DRAFT" && canAccounting && (
          <WorkflowButton
            label="ส่งตรวจสอบ"
            color="blue"
            pending={pending}
            onClick={() => act(() => submitJournal(entryId))}
          />
        )}

        {status === "PENDING_REVIEW" && canAccounting && (
          <WorkflowButton
            label="ยืนยัน (Verify)"
            color="green"
            pending={pending}
            onClick={() => act(() => verifyJournal(entryId))}
          />
        )}

        {status === "VERIFIED" && canManager && (
          <WorkflowButton
            label="อนุมัติ (Approve)"
            color="indigo"
            pending={pending}
            onClick={() => act(() => approveJournal(entryId))}
          />
        )}

        {status === "APPROVED" && canManager && (
          <WorkflowButton
            label="Post ลงบัญชี"
            color="purple"
            pending={pending}
            onClick={() => act(() => postJournal(entryId))}
          />
        )}

        {status === "POSTED" && canAccounting && (
          <WorkflowButton
            label="สร้าง Reversal"
            color="red"
            pending={pending}
            onClick={() => act(() => createReversal(entryId))}
          />
        )}
      </div>
    </div>
  );
}

function WorkflowButton({
  label,
  color,
  pending,
  onClick,
}: {
  label: string;
  color: "blue" | "green" | "indigo" | "purple" | "red";
  pending: boolean;
  onClick: () => void;
}) {
  const colorMap = {
    blue: "bg-blue-600 hover:bg-blue-700",
    green: "bg-green-600 hover:bg-green-700",
    indigo: "bg-indigo-600 hover:bg-indigo-700",
    purple: "bg-purple-600 hover:bg-purple-700",
    red: "bg-red-600 hover:bg-red-700",
  };

  return (
    <button
      onClick={onClick}
      disabled={pending}
      className={`${colorMap[color]} disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors`}
    >
      {pending ? "กำลังดำเนินการ..." : label}
    </button>
  );
}
