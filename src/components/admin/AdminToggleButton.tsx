"use client";

import { useState, useTransition } from "react";
import { toggleUserActive, updateUserRole, toggleRoomActive } from "@/app/actions/admin";

export function ToggleActiveButton({
  id,
  active,
  type,
}: {
  id: string;
  active: boolean;
  type: "user" | "room";
}) {
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useState(active);

  return (
    <button
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const fn = type === "user" ? toggleUserActive : toggleRoomActive;
          const result = await fn(id, !current);
          if (!result.error) setCurrent(!current);
        });
      }}
      className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
        current
          ? "bg-green-100 text-green-700 hover:bg-green-200"
          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
      } ${pending ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {pending ? "..." : current ? "เปิดใช้งาน" : "ปิดใช้งาน"}
    </button>
  );
}

export function RoleSelect({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: string;
}) {
  const [pending, startTransition] = useTransition();
  const [role, setRole] = useState(currentRole);

  const ROLES = ["OWNER", "MANAGER", "FRONT_DESK", "ACCOUNTING", "HOUSEKEEPING"];

  return (
    <select
      disabled={pending}
      value={role}
      onChange={(e) => {
        const newRole = e.target.value;
        startTransition(async () => {
          const result = await updateUserRole(userId, newRole);
          if (!result.error) setRole(newRole);
        });
      }}
      className={`text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 ${
        pending ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>{r}</option>
      ))}
    </select>
  );
}
