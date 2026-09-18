"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/audit/audit";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function nextPaymentReference(): Promise<string> {
  const setting = await db.systemSetting.findUnique({ where: { key: "payment.prefix" } });
  const prefix = setting?.value ?? "PAY";
  const year = new Date().getFullYear();
  const count = await db.payment.count();
  return `${prefix}-${year}-${String(count + 1).padStart(5, "0")}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type PaymentFormState = {
  success?: boolean;
  paymentId?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

// ─── Schemas ─────────────────────────────────────────────────────────────────

const RecordPaymentSchema = z.object({
  bookingId: z.string().min(1),
  amount: z.coerce.number().positive("จำนวนเงินต้องมากกว่า 0"),
  method: z.enum(["CASH", "BANK_TRANSFER", "PROMPTPAY", "PAYMENT_GATEWAY", "OTA", "OTHER"]),
  purpose: z.enum(["DEPOSIT", "BALANCE", "FULL", "EXTRA_CHARGE"]),
  transactionRef: z.string().optional(),
  paidAt: z.string().optional(),
  notes: z.string().optional(),
});

const RecordDepositSchema = z.object({
  bookingId: z.string().min(1),
  amount: z.coerce.number().positive("จำนวนเงินต้องมากกว่า 0"),
  notes: z.string().optional(),
});

// ─── Actions ─────────────────────────────────────────────────────────────────

/**
 * Record a payment for a booking.
 * Revenue = booking.grossAmount — deposit is NOT double-counted here.
 * If purpose=DEPOSIT, also creates/updates the Deposit record.
 */
export async function recordPayment(
  prev: PaymentFormState,
  formData: FormData
): Promise<PaymentFormState> {
  const session = await getSession();
  if (!session) return { error: "กรุณาเข้าสู่ระบบ" };

  const parsed = RecordPaymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { bookingId, amount, method, purpose, transactionRef, paidAt, notes } = parsed.data;

  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return { error: "ไม่พบการจอง" };
  if (booking.status === "CANCELLED") return { error: "ไม่สามารถบันทึกการชำระเงินสำหรับการจองที่ยกเลิกแล้ว" };

  const paymentReference = await nextPaymentReference();

  const payment = await db.$transaction(async (tx) => {
    const p = await tx.payment.create({
      data: {
        paymentReference,
        bookingId,
        amount,
        method,
        purpose,
        status: "PENDING",
        transactionRef: transactionRef || null,
        paidAt: paidAt ? new Date(paidAt) : new Date(),
        notes: notes || null,
        createdBy: session.id,
      },
    });

    // If deposit payment, create/update the Deposit record
    if (purpose === "DEPOSIT") {
      const existing = await tx.deposit.findUnique({ where: { bookingId } });
      if (existing) {
        await tx.deposit.update({
          where: { bookingId },
          data: { amount, status: "RECEIVED", paymentId: p.id },
        });
      } else {
        await tx.deposit.create({
          data: { bookingId, amount, status: "RECEIVED", paymentId: p.id },
        });
      }
    }

    return p;
  });

  await createAuditLog({
    userId: session.id,
    action: "CREATE",
    entityType: "Payment",
    entityId: payment.id,
    afterValue: { paymentReference, bookingId, amount, method, purpose },
  });

  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/payments");

  return { success: true, paymentId: payment.id };
}

/**
 * Record a deposit expectation for a booking (before payment arrives).
 */
export async function recordDeposit(
  prev: PaymentFormState,
  formData: FormData
): Promise<PaymentFormState> {
  const session = await getSession();
  if (!session) return { error: "กรุณาเข้าสู่ระบบ" };

  const parsed = RecordDepositSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { bookingId, amount, notes } = parsed.data;

  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return { error: "ไม่พบการจอง" };

  const existing = await db.deposit.findUnique({ where: { bookingId } });
  if (existing) return { error: "การจองนี้มีมัดจำอยู่แล้ว" };

  const deposit = await db.deposit.create({
    data: { bookingId, amount, status: "EXPECTED", notes: notes || null },
  });

  await createAuditLog({
    userId: session.id,
    action: "CREATE",
    entityType: "Deposit",
    entityId: deposit.id,
    afterValue: { bookingId, amount },
  });

  revalidatePath(`/bookings/${bookingId}`);

  return { success: true, paymentId: deposit.id };
}

/**
 * Verify a payment (mark as VERIFIED — requires ACCOUNTING or MANAGER role).
 * IMPORTANT: This does NOT auto-post to accounting. Status: PENDING → VERIFIED → APPROVED → POSTED (Phase 4).
 */
export async function verifyPayment(paymentId: string): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: "กรุณาเข้าสู่ระบบ" };
  if (!["OWNER", "MANAGER", "ACCOUNTING"].includes(session.role)) {
    return { error: "ไม่มีสิทธิ์ยืนยันการชำระเงิน" };
  }

  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: { booking: true },
  });
  if (!payment) return { error: "ไม่พบรายการชำระเงิน" };
  if (payment.status !== "PENDING") return { error: "รายการนี้ไม่ได้อยู่ในสถานะ PENDING" };

  await db.payment.update({
    where: { id: paymentId },
    data: { status: "VERIFIED", verifiedBy: session.id, verifiedAt: new Date() },
  });

  // If this was a deposit payment, update deposit status
  if (payment.purpose === "DEPOSIT") {
    await db.deposit.updateMany({
      where: { bookingId: payment.bookingId, paymentId: paymentId },
      data: { status: "RECEIVED" },
    });
  }

  await createAuditLog({
    userId: session.id,
    action: "VERIFY",
    entityType: "Payment",
    entityId: paymentId,
    afterValue: { status: "VERIFIED", verifiedBy: session.id },
  });

  revalidatePath(`/bookings/${payment.bookingId}`);
  revalidatePath("/payments");

  return {};
}

/**
 * Apply the deposit when the guest checks out — mark Deposit as APPLIED.
 * This is called automatically during check-out if a deposit exists.
 * Revenue remains booking.grossAmount; the deposit just reduces the final payment due.
 */
export async function applyDeposit(bookingId: string): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: "กรุณาเข้าสู่ระบบ" };

  const deposit = await db.deposit.findUnique({ where: { bookingId } });
  if (!deposit) return {};
  if (deposit.status === "APPLIED") return {};

  if (!["RECEIVED"].includes(deposit.status)) {
    return { error: `Deposit status is ${deposit.status} — cannot apply` };
  }

  await db.deposit.update({
    where: { bookingId },
    data: { status: "APPLIED", appliedAt: new Date() },
  });

  await createAuditLog({
    userId: session.id,
    action: "UPDATE",
    entityType: "Deposit",
    entityId: deposit.id,
    afterValue: { status: "APPLIED", bookingId },
  });

  return {};
}
