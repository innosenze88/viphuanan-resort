"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export async function submitRegistration(
  registrationId: string,
  submissionRef?: string
): Promise<{ error?: string }> {
  const user = await getSession();
  if (!user) return { error: "กรุณาเข้าสู่ระบบ" };

  const record = await db.registrationRecord.findUnique({
    where: { id: registrationId },
  });
  if (!record) return { error: "ไม่พบข้อมูลทะเบียน" };
  if (record.status === "SUBMITTED") return { error: "ส่งแล้ว" };
  if (record.status === "CANCELLED") return { error: "ยกเลิกแล้ว" };

  await db.registrationRecord.update({
    where: { id: registrationId },
    data: {
      status: "SUBMITTED",
      submittedBy: user.id,
      submittedAt: new Date(),
      submissionRef: submissionRef ?? null,
    },
  });

  revalidatePath("/registration");
  revalidatePath(`/registration/${registrationId}`);
  return {};
}

export async function bulkSubmitRegistration(
  registrationIds: string[]
): Promise<{ error?: string; submitted?: number }> {
  const user = await getSession();
  if (!user) return { error: "กรุณาเข้าสู่ระบบ" };
  if (registrationIds.length === 0) return { error: "ไม่มีรายการที่เลือก" };

  const result = await db.registrationRecord.updateMany({
    where: {
      id: { in: registrationIds },
      status: { in: ["PENDING", "OVERDUE"] },
    },
    data: {
      status: "SUBMITTED",
      submittedBy: user.id,
      submittedAt: new Date(),
    },
  });

  revalidatePath("/registration");
  return { submitted: result.count };
}

export async function cancelRegistration(
  registrationId: string
): Promise<{ error?: string }> {
  const user = await getSession();
  if (!user) return { error: "กรุณาเข้าสู่ระบบ" };

  const record = await db.registrationRecord.findUnique({
    where: { id: registrationId },
  });
  if (!record) return { error: "ไม่พบข้อมูลทะเบียน" };
  if (record.status === "SUBMITTED") return { error: "ส่งแล้ว ไม่สามารถยกเลิกได้" };

  await db.registrationRecord.update({
    where: { id: registrationId },
    data: { status: "CANCELLED" },
  });

  revalidatePath("/registration");
  revalidatePath(`/registration/${registrationId}`);
  return {};
}

// Called during page render — marks PENDING records past dueAt as OVERDUE.
// No revalidatePath here: the page that calls this is already rendering fresh data.
export async function markOverdueRegistrations(): Promise<{ updated: number }> {
  const now = new Date();
  const result = await db.registrationRecord.updateMany({
    where: {
      status: "PENDING",
      dueAt: { lt: now },
    },
    data: { status: "OVERDUE" },
  });
  return { updated: result.count };
}
