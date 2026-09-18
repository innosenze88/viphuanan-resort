"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export async function updateHousekeepingTask(
  taskId: string,
  status: "IN_PROGRESS" | "DONE" | "INSPECTED" | "CANCELLED"
): Promise<{ error?: string }> {
  const user = await getSession();
  if (!user) return { error: "Unauthorized" };

  const now = new Date();
  const data: Record<string, unknown> = { status };

  if (status === "IN_PROGRESS") data.startedAt = now;
  if (status === "DONE") data.completedAt = now;
  if (status === "INSPECTED") {
    data.inspectedBy = user.name;
    data.inspectedAt = now;
  }

  const task = await db.housekeepingTask.update({
    where: { id: taskId },
    data,
    include: { room: { select: { id: true } } },
  });

  // Sync room status when task is done/inspected
  if (status === "DONE") {
    await db.room.update({
      where: { id: task.room.id },
      data: { status: "INSPECTED" },
    });
  }
  if (status === "INSPECTED") {
    await db.room.update({
      where: { id: task.room.id },
      data: { status: "VACANT" },
    });
  }
  if (status === "IN_PROGRESS") {
    await db.room.update({
      where: { id: task.room.id },
      data: { status: "CLEANING" },
    });
  }

  revalidatePath("/housekeeping");
  revalidatePath("/front-desk/rooms");
  return {};
}

export async function assignHousekeepingTask(
  taskId: string,
  assignedTo: string
): Promise<{ error?: string }> {
  const user = await getSession();
  if (!user) return { error: "Unauthorized" };

  await db.housekeepingTask.update({
    where: { id: taskId },
    data: { assignedTo },
  });

  revalidatePath("/housekeeping");
  return {};
}

export async function createHousekeepingTask(formData: FormData): Promise<{ error?: string }> {
  const user = await getSession();
  if (!user) return { error: "Unauthorized" };

  const roomId = formData.get("roomId") as string;
  const taskType = (formData.get("taskType") as string) || "DAILY_SERVICE";
  const priority = (formData.get("priority") as string) || "NORMAL";
  const notes = formData.get("notes") as string | null;
  const assignedTo = formData.get("assignedTo") as string | null;

  if (!roomId) return { error: "กรุณาเลือกห้องพัก" };

  await db.housekeepingTask.create({
    data: {
      roomId,
      taskType: taskType as never,
      priority: priority as never,
      notes: notes || undefined,
      assignedTo: assignedTo || undefined,
      createdBy: user.name,
    },
  });

  revalidatePath("/housekeeping");
  return {};
}
