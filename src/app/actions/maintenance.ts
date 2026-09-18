"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export async function createMaintenanceRequest(
  formData: FormData
): Promise<{ error?: string }> {
  const user = await getSession();
  if (!user) return { error: "Unauthorized" };

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const roomId = (formData.get("roomId") as string) || null;
  const priority = (formData.get("priority") as string) || "NORMAL";

  if (!title?.trim()) return { error: "กรุณาระบุหัวข้อ" };
  if (!description?.trim()) return { error: "กรุณาระบุรายละเอียด" };

  // If HIGH/URGENT and room provided, mark room OUT_OF_ORDER
  const markOutOfOrder =
    roomId &&
    (priority === "HIGH" || priority === "URGENT") &&
    formData.get("outOfOrder") === "true";

  await db.$transaction(async (tx) => {
    await tx.maintenanceRequest.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        roomId: roomId || undefined,
        priority: priority as never,
        createdBy: user.name,
      },
    });

    if (markOutOfOrder) {
      await tx.room.update({
        where: { id: roomId! },
        data: { status: "OUT_OF_ORDER" },
      });
    }
  });

  revalidatePath("/maintenance");
  revalidatePath("/front-desk/rooms");
  return {};
}

export async function updateMaintenanceStatus(
  requestId: string,
  status: "IN_PROGRESS" | "RESOLVED" | "CANCELLED",
  notes?: string
): Promise<{ error?: string }> {
  const user = await getSession();
  if (!user) return { error: "Unauthorized" };

  const data: Record<string, unknown> = { status };
  if (status === "RESOLVED") {
    data.resolvedBy = user.name;
    data.resolvedAt = new Date();
    if (notes) data.notes = notes;
  }

  const req = await db.maintenanceRequest.update({
    where: { id: requestId },
    data,
    include: { room: { select: { id: true, status: true } } },
  });

  // If resolved and the room is currently OUT_OF_ORDER, offer to restore it
  // (actual restore is a separate action — we just mark task resolved here)
  revalidatePath("/maintenance");
  revalidatePath("/front-desk/rooms");

  // Suppress unused variable warning
  void req;

  return {};
}

export async function assignMaintenanceRequest(
  requestId: string,
  assignedTo: string
): Promise<{ error?: string }> {
  const user = await getSession();
  if (!user) return { error: "Unauthorized" };

  await db.maintenanceRequest.update({
    where: { id: requestId },
    data: { assignedTo, status: "IN_PROGRESS" },
  });

  revalidatePath("/maintenance");
  return {};
}

export async function restoreRoomFromMaintenance(
  roomId: string
): Promise<{ error?: string }> {
  const user = await getSession();
  if (!user) return { error: "Unauthorized" };

  await db.room.update({
    where: { id: roomId },
    data: { status: "VACANT" },
  });

  revalidatePath("/maintenance");
  revalidatePath("/front-desk/rooms");
  revalidatePath("/housekeeping");
  return {};
}
