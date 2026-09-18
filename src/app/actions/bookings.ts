"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { createAuditLog, AuditAction } from "@/lib/audit/audit";
import { nextBookingReference } from "@/lib/reference";
import { BookingSource, RoomStatus, StayStatus } from "@prisma/client";

const BookingSchema = z.object({
  guestId: z.string().min(1),
  roomId: z.string().min(1),
  source: z.nativeEnum(BookingSource).default("DIRECT"),
  checkInDate: z.string().min(1, "กรุณาเลือกวันเช็คอิน"),
  checkOutDate: z.string().min(1, "กรุณาเลือกวันเช็คเอาท์"),
  roomRate: z.coerce.number().positive("กรุณาระบุราคาห้อง"),
  discount: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
});

export type BookingFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  bookingId?: string;
};

export async function createBooking(
  _prev: BookingFormState,
  formData: FormData
): Promise<BookingFormState> {
  const user = await getSession();
  if (!user) return { error: "กรุณาเข้าสู่ระบบ" };

  const raw = Object.fromEntries(formData.entries());
  const parsed = BookingSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const d = parsed.data;
  const checkIn = new Date(d.checkInDate);
  const checkOut = new Date(d.checkOutDate);

  if (checkOut <= checkIn) {
    return { error: "วันเช็คเอาท์ต้องหลังวันเช็คอิน" };
  }

  const nights = Math.ceil(
    (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
  );
  const gross = d.roomRate * nights - d.discount;

  const ref = await nextBookingReference();

  const booking = await db.$transaction(async (tx) => {
    const b = await tx.booking.create({
      data: {
        bookingReference: ref,
        guestId: d.guestId,
        roomId: d.roomId,
        source: d.source,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        numberOfNights: nights,
        roomRate: d.roomRate,
        discount: d.discount,
        grossAmount: gross,
        notes: d.notes,
        createdBy: user.id,
      },
    });

    // Create Stay record
    await tx.stay.create({
      data: {
        bookingId: b.id,
        guestId: d.guestId,
        roomId: d.roomId,
        status: StayStatus.EXPECTED,
      },
    });

    // Mark room as RESERVED
    await tx.room.update({
      where: { id: d.roomId },
      data: { status: RoomStatus.RESERVED },
    });

    return b;
  });

  await createAuditLog({
    userId: user.id,
    action: AuditAction.CREATE,
    entityType: "booking",
    entityId: booking.id,
    afterValue: { bookingReference: ref, guestId: d.guestId, roomId: d.roomId } as never,
  });

  revalidatePath("/bookings");
  revalidatePath("/front-desk/rooms");
  revalidatePath("/dashboard");
  return { bookingId: booking.id };
}

export async function checkIn(bookingId: string): Promise<{ error?: string }> {
  const user = await getSession();
  if (!user) return { error: "กรุณาเข้าสู่ระบบ" };

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      stays: true,
      guest: true,
      room: { select: { roomNumber: true } },
    },
  });

  if (!booking) return { error: "ไม่พบข้อมูลการจอง" };
  if (booking.status === "CHECKED_IN") return { error: "เช็คอินไปแล้ว" };
  if (booking.status === "CANCELLED") return { error: "การจองถูกยกเลิก" };

  const stay = booking.stays[0];
  if (!stay) return { error: "ไม่พบข้อมูล Stay" };

  const now = new Date();
  const isForeign = booking.guest.nationality !== "ไทย" && booking.guest.nationality !== "Thai";

  // Due-date helpers
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const plus24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  await db.$transaction(async (tx) => {
    await tx.stay.update({
      where: { id: stay.id },
      data: {
        status: StayStatus.CHECKED_IN,
        actualCheckIn: now,
        checkedInBy: user.id,
      },
    });

    await tx.booking.update({
      where: { id: bookingId },
      data: { status: "CHECKED_IN" },
    });

    await tx.room.update({
      where: { id: booking.roomId },
      data: { status: RoomStatus.OCCUPIED },
    });

    const guestSnap = {
      guestName: booking.guest.fullName,
      nationality: booking.guest.nationality ?? undefined,
      idType: booking.guest.idType ? String(booking.guest.idType) : undefined,
      idNumber: booking.guest.idNumber ?? undefined,
      roomNumber: booking.room.roomNumber,
    };

    if (isForeign) {
      // Foreign guests: RR4 (police) + TM30 (immigration) — both due within 24h
      await tx.registrationRecord.createMany({
        data: [
          { bookingId, stayId: stay.id, guestId: booking.guestId, registrationType: "RR4", checkInDate: now, dueAt: plus24h, ...guestSnap },
          { bookingId, stayId: stay.id, guestId: booking.guestId, registrationType: "TM30", checkInDate: now, dueAt: plus24h, ...guestSnap },
        ],
      });
    } else {
      // Thai guests: RR3 (hotel register) — due by end of check-in day
      await tx.registrationRecord.create({
        data: { bookingId, stayId: stay.id, guestId: booking.guestId, registrationType: "RR3", checkInDate: now, dueAt: endOfDay, ...guestSnap },
      });
    }
  });

  await createAuditLog({
    userId: user.id,
    action: AuditAction.CHECKIN,
    entityType: "booking",
    entityId: bookingId,
    afterValue: { status: "CHECKED_IN", checkedInAt: new Date().toISOString() } as never,
  });

  revalidatePath("/front-desk/rooms");
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/dashboard");
  revalidatePath("/registration");
  return {};
}

export async function checkOut(bookingId: string): Promise<{ error?: string }> {
  const user = await getSession();
  if (!user) return { error: "กรุณาเข้าสู่ระบบ" };

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { stays: true },
  });

  if (!booking) return { error: "ไม่พบข้อมูลการจอง" };
  if (booking.status !== "CHECKED_IN") return { error: "ต้องเช็คอินก่อน" };

  const stay = booking.stays.find((s) => s.status === "CHECKED_IN");
  if (!stay) return { error: "ไม่พบ Stay ที่ active" };

  await db.$transaction(async (tx) => {
    await tx.stay.update({
      where: { id: stay.id },
      data: {
        status: StayStatus.CHECKED_OUT,
        actualCheckOut: new Date(),
        checkedOutBy: user.id,
      },
    });

    await tx.booking.update({
      where: { id: bookingId },
      data: { status: "CHECKED_OUT" },
    });

    // Room → DIRTY after checkout
    await tx.room.update({
      where: { id: booking.roomId },
      data: { status: RoomStatus.DIRTY },
    });
  });

  await createAuditLog({
    userId: user.id,
    action: AuditAction.CHECKOUT,
    entityType: "booking",
    entityId: bookingId,
    afterValue: { status: "CHECKED_OUT", checkedOutAt: new Date().toISOString() } as never,
  });

  revalidatePath("/front-desk/rooms");
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/dashboard");
  return {};
}
