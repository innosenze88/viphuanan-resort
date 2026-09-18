"use client";

import { useState, useTransition } from "react";
import { updateHousekeepingTask } from "@/app/actions/housekeeping";

type Status = "IN_PROGRESS" | "DONE" | "INSPECTED" | "CANCELLED";

const NEXT_ACTION: Record<string, { status: Status; label: string; cls: string } | null> = {
  PENDING: { status: "IN_PROGRESS", label: "เริ่มทำความสะอาด", cls: "bg-blue-600 hover:bg-blue-700 text-white" },
  IN_PROGRESS: { status: "DONE", label: "ทำเสร็จแล้ว", cls: "bg-green-600 hover:bg-green-700 text-white" },
  DONE: { status: "INSPECTED", label: "ตรวจผ่านแล้ว", cls: "bg-purple-600 hover:bg-purple-700 text-white" },
  INSPECTED: null,
  CANCELLED: null,
};

export function TaskActionButton({
  taskId,
  currentStatus,
}: {
  taskId: string;
  currentStatus: string;
}) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  const action = NEXT_ACTION[currentStatus];
  if (!action || done) return null;

  return (
    <button
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await updateHousekeepingTask(taskId, action.status);
          setDone(true);
        });
      }}
      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity ${action.cls} ${
        pending ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      {pending ? "..." : action.label}
    </button>
  );
}
