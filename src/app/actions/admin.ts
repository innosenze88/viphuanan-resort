"use server";

import { revalidatePath } from "next/cache";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { createAuditLog, AuditAction } from "@/lib/audit/audit";

// ─── USERS ───────────────────────────────────────────────────────────────────

export async function createUser(formData: FormData): Promise<{ error?: string }> {
  const user = await getSession();
  if (!user || user.role !== "OWNER") return { error: "เฉพาะ OWNER เท่านั้น" };

  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const role = (formData.get("role") as string) || "FRONT_DESK";

  if (!name || !email || !password) return { error: "กรุณากรอกข้อมูลให้ครบ" };
  if (password.length < 8) return { error: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" };

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { error: "อีเมลนี้มีอยู่ในระบบแล้ว" };

  const passwordHash = await hash(password, 12);

  const newUser = await db.user.create({
    data: { name, email, passwordHash, role: role as never },
  });

  await createAuditLog({
    userId: user.id,
    action: AuditAction.CREATE,
    entityType: "user",
    entityId: newUser.id,
    afterValue: { name, email, role },
  });

  revalidatePath("/admin/users");
  return {};
}

export async function updateUserRole(
  targetUserId: string,
  newRole: string
): Promise<{ error?: string }> {
  const user = await getSession();
  if (!user || user.role !== "OWNER") return { error: "เฉพาะ OWNER เท่านั้น" };
  if (targetUserId === user.id) return { error: "ไม่สามารถเปลี่ยน role ของตัวเองได้" };

  const before = await db.user.findUnique({
    where: { id: targetUserId },
    select: { role: true },
  });

  await db.user.update({
    where: { id: targetUserId },
    data: { role: newRole as never },
  });

  await createAuditLog({
    userId: user.id,
    action: AuditAction.UPDATE,
    entityType: "user",
    entityId: targetUserId,
    beforeValue: { role: before?.role },
    afterValue: { role: newRole },
  });

  revalidatePath("/admin/users");
  return {};
}

export async function toggleUserActive(
  targetUserId: string,
  active: boolean
): Promise<{ error?: string }> {
  const user = await getSession();
  if (!user || user.role !== "OWNER") return { error: "เฉพาะ OWNER เท่านั้น" };
  if (targetUserId === user.id) return { error: "ไม่สามารถปิดการใช้งานตัวเองได้" };

  await db.user.update({
    where: { id: targetUserId },
    data: { active },
  });

  await createAuditLog({
    userId: user.id,
    action: active ? AuditAction.RESTORE : AuditAction.ARCHIVE,
    entityType: "user",
    entityId: targetUserId,
    afterValue: { active },
  });

  revalidatePath("/admin/users");
  return {};
}

// ─── ROOMS ────────────────────────────────────────────────────────────────────

export async function createRoom(formData: FormData): Promise<{ error?: string }> {
  const user = await getSession();
  if (!user || !["OWNER", "MANAGER"].includes(user.role)) return { error: "ไม่มีสิทธิ์" };

  const roomNumber = (formData.get("roomNumber") as string)?.trim();
  const basePriceRaw = formData.get("basePrice") as string;
  const description = (formData.get("description") as string)?.trim() || null;

  if (!roomNumber) return { error: "กรุณาระบุเลขห้อง" };
  const basePrice = parseFloat(basePriceRaw);
  if (isNaN(basePrice) || basePrice < 0) return { error: "ราคาไม่ถูกต้อง" };

  const existing = await db.room.findUnique({ where: { roomNumber } });
  if (existing) return { error: `ห้อง ${roomNumber} มีอยู่แล้ว` };

  const room = await db.room.create({
    data: { roomNumber, basePrice, description: description || undefined },
  });

  await createAuditLog({
    userId: user.id,
    action: AuditAction.CREATE,
    entityType: "room",
    entityId: room.id,
    afterValue: { roomNumber, basePrice },
  });

  revalidatePath("/admin/rooms");
  revalidatePath("/front-desk/rooms");
  return {};
}

export async function updateRoom(
  roomId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const user = await getSession();
  if (!user || !["OWNER", "MANAGER"].includes(user.role)) return { error: "ไม่มีสิทธิ์" };

  const basePriceRaw = formData.get("basePrice") as string;
  const description = (formData.get("description") as string)?.trim() || null;

  const basePrice = parseFloat(basePriceRaw);
  if (isNaN(basePrice) || basePrice < 0) return { error: "ราคาไม่ถูกต้อง" };

  const before = await db.room.findUnique({
    where: { id: roomId },
    select: { basePrice: true, description: true },
  });

  await db.room.update({
    where: { id: roomId },
    data: { basePrice, description: description || undefined },
  });

  await createAuditLog({
    userId: user.id,
    action: AuditAction.UPDATE,
    entityType: "room",
    entityId: roomId,
    beforeValue: { basePrice: before?.basePrice, description: before?.description },
    afterValue: { basePrice, description },
  });

  revalidatePath("/admin/rooms");
  return {};
}

export async function toggleRoomActive(
  roomId: string,
  active: boolean
): Promise<{ error?: string }> {
  const user = await getSession();
  if (!user || !["OWNER", "MANAGER"].includes(user.role)) return { error: "ไม่มีสิทธิ์" };

  await db.room.update({
    where: { id: roomId },
    data: { active },
  });

  await createAuditLog({
    userId: user.id,
    action: active ? AuditAction.RESTORE : AuditAction.ARCHIVE,
    entityType: "room",
    entityId: roomId,
    afterValue: { active },
  });

  revalidatePath("/admin/rooms");
  revalidatePath("/front-desk/rooms");
  return {};
}

// ─── SYSTEM SETTINGS ──────────────────────────────────────────────────────────

export async function upsertSystemSetting(
  key: string,
  value: string
): Promise<{ error?: string }> {
  const user = await getSession();
  if (!user || !["OWNER", "MANAGER"].includes(user.role)) return { error: "ไม่มีสิทธิ์" };

  await db.systemSetting.upsert({
    where: { key },
    update: { value, updatedBy: user.name },
    create: { key, value, updatedBy: user.name },
  });

  revalidatePath("/admin");
  return {};
}

export async function saveSystemSettings(formData: FormData): Promise<{ error?: string }> {
  const user = await getSession();
  if (!user || !["OWNER", "MANAGER"].includes(user.role)) return { error: "ไม่มีสิทธิ์" };

  const fields = ["resort_name", "resort_address", "resort_phone", "resort_tax_id"];

  await Promise.all(
    fields.map(async (key) => {
      const value = (formData.get(key) as string)?.trim() ?? "";
      await db.systemSetting.upsert({
        where: { key },
        update: { value, updatedBy: user.name },
        create: { key, value, updatedBy: user.name },
      });
    })
  );

  revalidatePath("/admin");
  return {};
}
