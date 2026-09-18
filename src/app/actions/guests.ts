"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { createAuditLog, AuditAction } from "@/lib/audit/audit";
import { Gender, IdType } from "@prisma/client";

const GuestSchema = z.object({
  title: z.string().optional(),
  firstName: z.string().min(1, "กรุณากรอกชื่อ"),
  lastName: z.string().min(1, "กรุณากรอกนามสกุล"),
  gender: z.nativeEnum(Gender).default("UNSPECIFIED"),
  nationality: z.string().optional(),
  dateOfBirth: z.string().optional(),
  idType: z.nativeEnum(IdType).optional(),
  idNumber: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  occupation: z.string().optional(),
  notes: z.string().optional(),
});

export type GuestFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  guestId?: string;
};

export async function createGuest(
  _prev: GuestFormState,
  formData: FormData
): Promise<GuestFormState> {
  const user = await getSession();
  if (!user) return { error: "กรุณาเข้าสู่ระบบ" };

  const raw = Object.fromEntries(formData.entries());
  const parsed = GuestSchema.safeParse(raw);

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const d = parsed.data;
  const fullName = [d.title, d.firstName, d.lastName].filter(Boolean).join(" ");

  const guest = await db.guest.create({
    data: {
      title: d.title,
      firstName: d.firstName,
      lastName: d.lastName,
      fullName,
      gender: d.gender,
      nationality: d.nationality,
      dateOfBirth: d.dateOfBirth ? new Date(d.dateOfBirth) : undefined,
      idType: d.idType,
      idNumber: d.idNumber || undefined,
      phone: d.phone || undefined,
      email: d.email || undefined,
      address: d.address,
      occupation: d.occupation,
      notes: d.notes,
    },
  });

  await createAuditLog({
    userId: user.id,
    action: AuditAction.CREATE,
    entityType: "guest",
    entityId: guest.id,
    afterValue: { id: guest.id, fullName },
  });

  revalidatePath("/guests");
  return { guestId: guest.id };
}

export async function updateGuest(
  guestId: string,
  _prev: GuestFormState,
  formData: FormData
): Promise<GuestFormState> {
  const user = await getSession();
  if (!user) return { error: "กรุณาเข้าสู่ระบบ" };

  const raw = Object.fromEntries(formData.entries());
  const parsed = GuestSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const before = await db.guest.findUnique({ where: { id: guestId } });
  const d = parsed.data;
  const fullName = [d.title, d.firstName, d.lastName].filter(Boolean).join(" ");

  await db.guest.update({
    where: { id: guestId },
    data: {
      title: d.title,
      firstName: d.firstName,
      lastName: d.lastName,
      fullName,
      gender: d.gender,
      nationality: d.nationality,
      dateOfBirth: d.dateOfBirth ? new Date(d.dateOfBirth) : undefined,
      idType: d.idType,
      idNumber: d.idNumber || undefined,
      phone: d.phone || undefined,
      email: d.email || undefined,
      address: d.address,
      occupation: d.occupation,
      notes: d.notes,
    },
  });

  await createAuditLog({
    userId: user.id,
    action: AuditAction.UPDATE,
    entityType: "guest",
    entityId: guestId,
    beforeValue: before as never,
    afterValue: { fullName } as never,
  });

  revalidatePath(`/guests/${guestId}`);
  revalidatePath("/guests");
  return { guestId };
}
