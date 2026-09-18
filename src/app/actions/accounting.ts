"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/audit/audit";
import type { JournalType } from "@prisma/client";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function nextEntryNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await db.journalEntry.count();
  return `JE-${year}-${String(count + 1).padStart(5, "0")}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type JournalFormState = {
  success?: boolean;
  entryId?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export type ExpenseFormState = {
  success?: boolean;
  expenseId?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

// ─── Schemas ─────────────────────────────────────────────────────────────────

const CreateJournalSchema = z.object({
  type: z.enum(["REVENUE", "EXPENSE", "ADJUSTMENT", "REVERSAL", "CORRECTION", "OTHER"]),
  entryDate: z.string().min(1, "กรุณาระบุวันที่"),
  description: z.string().min(1, "กรุณาระบุคำอธิบาย"),
  bookingId: z.string().optional(),
  paymentId: z.string().optional(),
  // Lines encoded as JSON string from the form
  linesJson: z.string().min(1),
});

const CreateExpenseSchema = z.object({
  expenseDate: z.string().min(1, "กรุณาระบุวันที่"),
  category: z.enum(["UTILITIES","MAINTENANCE","SUPPLIES","STAFFING","MARKETING","DEPRECIATION","OTHER"]),
  description: z.string().min(1, "กรุณาระบุรายละเอียด"),
  amount: z.coerce.number().positive("จำนวนเงินต้องมากกว่า 0"),
  vendor: z.string().optional(),
  receiptRef: z.string().optional(),
});

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function createJournalEntry(
  prev: JournalFormState,
  formData: FormData
): Promise<JournalFormState> {
  const session = await getSession();
  if (!session) return { error: "กรุณาเข้าสู่ระบบ" };
  if (!["OWNER", "MANAGER", "ACCOUNTING"].includes(session.role)) {
    return { error: "ไม่มีสิทธิ์สร้างรายการบัญชี" };
  }

  const parsed = CreateJournalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const { type, entryDate, description, bookingId, paymentId, linesJson } = parsed.data;

  let lines: { debitAccountId?: string; creditAccountId?: string; amount: number; description?: string }[];
  try {
    lines = JSON.parse(linesJson);
  } catch {
    return { error: "ข้อมูลรายการบัญชีไม่ถูกต้อง" };
  }

  if (!lines.length) return { error: "ต้องมีอย่างน้อย 1 รายการ" };

  const totalDebits = lines.reduce((s, l) => s + (l.debitAccountId ? l.amount : 0), 0);
  const totalCredits = lines.reduce((s, l) => s + (l.creditAccountId ? l.amount : 0), 0);
  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    return { error: `Debit (${totalDebits}) ≠ Credit (${totalCredits}) — ต้องเท่ากัน` };
  }

  const entryNumber = await nextEntryNumber();

  const entry = await db.journalEntry.create({
    data: {
      entryNumber,
      type: type as JournalType,
      status: "DRAFT",
      entryDate: new Date(entryDate),
      description,
      bookingId: bookingId || null,
      paymentId: paymentId || null,
      createdBy: session.id,
      lines: {
        create: lines.map((l) => ({
          debitAccountId: l.debitAccountId || null,
          creditAccountId: l.creditAccountId || null,
          amount: l.amount,
          description: l.description || null,
        })),
      },
    },
  });

  await createAuditLog({
    userId: session.id,
    action: "CREATE",
    entityType: "JournalEntry",
    entityId: entry.id,
    afterValue: { entryNumber, type, status: "DRAFT" },
  });

  revalidatePath("/accounting");
  return { success: true, entryId: entry.id };
}

// DRAFT → PENDING_REVIEW
export async function submitJournal(entryId: string): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: "กรุณาเข้าสู่ระบบ" };

  const entry = await db.journalEntry.findUnique({ where: { id: entryId } });
  if (!entry) return { error: "ไม่พบรายการ" };
  if (entry.status !== "DRAFT") return { error: `สถานะปัจจุบัน: ${entry.status}` };
  if (entry.createdBy !== session.id && !["OWNER","MANAGER"].includes(session.role)) {
    return { error: "ไม่มีสิทธิ์" };
  }

  await db.journalEntry.update({
    where: { id: entryId },
    data: { status: "PENDING_REVIEW", submittedBy: session.id, submittedAt: new Date() },
  });

  await createAuditLog({ userId: session.id, action: "UPDATE", entityType: "JournalEntry", entityId: entryId, afterValue: { status: "PENDING_REVIEW" } });
  revalidatePath("/accounting");
  revalidatePath(`/accounting/entries/${entryId}`);
  return {};
}

// PENDING_REVIEW → VERIFIED
export async function verifyJournal(entryId: string): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: "กรุณาเข้าสู่ระบบ" };
  if (!["OWNER", "MANAGER", "ACCOUNTING"].includes(session.role)) return { error: "ไม่มีสิทธิ์" };

  const entry = await db.journalEntry.findUnique({ where: { id: entryId } });
  if (!entry) return { error: "ไม่พบรายการ" };
  if (entry.status !== "PENDING_REVIEW") return { error: `สถานะปัจจุบัน: ${entry.status}` };

  await db.journalEntry.update({
    where: { id: entryId },
    data: { status: "VERIFIED", verifiedBy: session.id, verifiedAt: new Date() },
  });

  await createAuditLog({ userId: session.id, action: "VERIFY", entityType: "JournalEntry", entityId: entryId, afterValue: { status: "VERIFIED" } });
  revalidatePath("/accounting");
  revalidatePath(`/accounting/entries/${entryId}`);
  return {};
}

// VERIFIED → APPROVED
export async function approveJournal(entryId: string): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: "กรุณาเข้าสู่ระบบ" };
  if (!["OWNER", "MANAGER"].includes(session.role)) return { error: "ไม่มีสิทธิ์ — ต้องการสิทธิ์ MANAGER หรือ OWNER" };

  const entry = await db.journalEntry.findUnique({ where: { id: entryId } });
  if (!entry) return { error: "ไม่พบรายการ" };
  if (entry.status !== "VERIFIED") return { error: `สถานะปัจจุบัน: ${entry.status}` };

  await db.journalEntry.update({
    where: { id: entryId },
    data: { status: "APPROVED", approvedBy: session.id, approvedAt: new Date() },
  });

  await createAuditLog({ userId: session.id, action: "APPROVE", entityType: "JournalEntry", entityId: entryId, afterValue: { status: "APPROVED" } });
  revalidatePath("/accounting");
  revalidatePath(`/accounting/entries/${entryId}`);
  return {};
}

// APPROVED → POSTED (immutable after this — use Reversal to undo)
export async function postJournal(entryId: string): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: "กรุณาเข้าสู่ระบบ" };
  if (!["OWNER", "MANAGER"].includes(session.role)) return { error: "ไม่มีสิทธิ์ — ต้องการสิทธิ์ MANAGER หรือ OWNER" };

  const entry = await db.journalEntry.findUnique({ where: { id: entryId } });
  if (!entry) return { error: "ไม่พบรายการ" };
  if (entry.status !== "APPROVED") return { error: `สถานะปัจจุบัน: ${entry.status} — ต้อง APPROVED ก่อน POST` };

  await db.journalEntry.update({
    where: { id: entryId },
    data: { status: "POSTED", postedBy: session.id, postedAt: new Date() },
  });

  await createAuditLog({ userId: session.id, action: "POST", entityType: "JournalEntry", entityId: entryId, afterValue: { status: "POSTED" } });
  revalidatePath("/accounting");
  revalidatePath(`/accounting/entries/${entryId}`);
  return {};
}

/**
 * Create a Reversal entry for a POSTED journal.
 * The original entry is NEVER modified — a new DRAFT reversal is created.
 */
export async function createReversal(entryId: string): Promise<{ error?: string; reversalId?: string }> {
  const session = await getSession();
  if (!session) return { error: "กรุณาเข้าสู่ระบบ" };
  if (!["OWNER", "MANAGER", "ACCOUNTING"].includes(session.role)) return { error: "ไม่มีสิทธิ์" };

  const original = await db.journalEntry.findUnique({
    where: { id: entryId },
    include: { lines: true },
  });
  if (!original) return { error: "ไม่พบรายการต้นฉบับ" };
  if (original.status !== "POSTED") return { error: "สามารถสร้าง Reversal ได้เฉพาะรายการที่ POSTED แล้ว" };

  const alreadyReversed = await db.journalEntry.findFirst({
    where: { reversalOf: entryId, status: { not: "DRAFT" } },
  });
  if (alreadyReversed) return { error: "รายการนี้มี Reversal อยู่แล้ว" };

  const entryNumber = await nextEntryNumber();

  const reversal = await db.journalEntry.create({
    data: {
      entryNumber,
      type: "REVERSAL",
      status: "DRAFT",
      entryDate: new Date(),
      description: `[Reversal] ${original.description} (${original.entryNumber})`,
      bookingId: original.bookingId,
      reversalOf: original.id,
      createdBy: session.id,
      lines: {
        // Swap debit ↔ credit on every line
        create: original.lines.map((l) => ({
          debitAccountId: l.creditAccountId,
          creditAccountId: l.debitAccountId,
          amount: l.amount,
          description: `[Reversal] ${l.description ?? ""}`,
        })),
      },
    },
  });

  await createAuditLog({
    userId: session.id,
    action: "ADJUST",
    entityType: "JournalEntry",
    entityId: reversal.id,
    afterValue: { type: "REVERSAL", reversalOf: entryId, entryNumber },
  });

  revalidatePath("/accounting");
  return { reversalId: reversal.id };
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export async function createExpense(
  prev: ExpenseFormState,
  formData: FormData
): Promise<ExpenseFormState> {
  const session = await getSession();
  if (!session) return { error: "กรุณาเข้าสู่ระบบ" };
  if (!["OWNER", "MANAGER", "ACCOUNTING"].includes(session.role)) {
    return { error: "ไม่มีสิทธิ์บันทึกค่าใช้จ่าย" };
  }

  const parsed = CreateExpenseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const { expenseDate, category, description, amount, vendor, receiptRef } = parsed.data;

  const expense = await db.expense.create({
    data: {
      expenseDate: new Date(expenseDate),
      category,
      description,
      amount,
      vendor: vendor || null,
      receiptRef: receiptRef || null,
      createdBy: session.id,
    },
  });

  await createAuditLog({
    userId: session.id,
    action: "CREATE",
    entityType: "Expense",
    entityId: expense.id,
    afterValue: { category, amount, description },
  });

  revalidatePath("/accounting/expenses");
  return { success: true, expenseId: expense.id };
}
