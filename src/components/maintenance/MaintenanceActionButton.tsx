"use client";

import { useState, useTransition } from "react";
import { updateMaintenanceStatus, restoreRoomFromMaintenance } from "@/app/actions/maintenance";

export function MaintenanceStatusButton({
  requestId,
  currentStatus,
}: {
  requestId: string;
  currentStatus: string;
}) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  if (done || currentStatus === "RESOLVED" || currentStatus === "CANCELLED") return null;

  const isOpen = currentStatus === "OPEN";
  const label = isOpen ? "รับงาน" : "แก้ไขแล้ว";
  const nextStatus: "IN_PROGRESS" | "RESOLVED" = isOpen ? "IN_PROGRESS" : "RESOLVED";
  const cls = isOpen
    ? "bg-blue-600 hover:bg-blue-700 text-white"
    : "bg-green-600 hover:bg-green-700 text-white";

  return (
    <button
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await updateMaintenanceStatus(requestId, nextStatus);
          setDone(true);
        });
      }}
      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity ${cls} ${
        pending ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      {pending ? "..." : label}
    </button>
  );
}

export function RestoreRoomButton({ roomId }: { roomId: string }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  if (done) return <span className="text-xs text-green-600">คืนสถานะแล้ว ✓</span>;

  return (
    <button
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await restoreRoomFromMaintenance(roomId);
          setDone(true);
        });
      }}
      className={`text-xs px-3 py-1.5 rounded-lg font-medium bg-amber-500 hover:bg-amber-600 text-white transition-opacity ${
        pending ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      {pending ? "..." : "คืนสถานะ VACANT"}
    </button>
  );
}
