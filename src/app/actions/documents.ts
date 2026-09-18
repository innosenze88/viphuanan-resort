"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/audit/audit";

// ─── Verify ───────────────────────────────────────────────────────────────────

export async function verifyDocument(
  documentId: string,
  notes?: string
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: "กรุณาเข้าสู่ระบบ" };

  if (!["OWNER", "MANAGER", "ACCOUNTING"].includes(session.role)) {
    return { error: "ไม่มีสิทธิ์ยืนยันเอกสาร" };
  }

  const doc = await db.document.findUnique({ where: { id: documentId } });
  if (!doc) return { error: "ไม่พบเอกสาร" };
  if (doc.status !== "PENDING_REVIEW") {
    return { error: `เอกสารอยู่ในสถานะ ${doc.status} — ไม่สามารถยืนยันได้` };
  }

  await db.document.update({
    where: { id: documentId },
    data: {
      status: "VERIFIED",
      reviewedBy: session.id,
      reviewedAt: new Date(),
      reviewNotes: notes || null,
    },
  });

  await createAuditLog({
    userId: session.id,
    action: "VERIFY",
    entityType: "Document",
    entityId: documentId,
    afterValue: { status: "VERIFIED", notes },
  });

  revalidatePath("/documents");
  revalidatePath(`/documents/${documentId}`);

  return {};
}

// ─── Reject ───────────────────────────────────────────────────────────────────

export async function rejectDocument(
  documentId: string,
  reason: string
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: "กรุณาเข้าสู่ระบบ" };

  if (!["OWNER", "MANAGER", "ACCOUNTING"].includes(session.role)) {
    return { error: "ไม่มีสิทธิ์ปฏิเสธเอกสาร" };
  }

  if (!reason?.trim()) return { error: "กรุณาระบุเหตุผล" };

  const doc = await db.document.findUnique({ where: { id: documentId } });
  if (!doc) return { error: "ไม่พบเอกสาร" };
  if (doc.status !== "PENDING_REVIEW") {
    return { error: `เอกสารอยู่ในสถานะ ${doc.status} — ไม่สามารถปฏิเสธได้` };
  }

  await db.document.update({
    where: { id: documentId },
    data: {
      status: "REJECTED",
      reviewedBy: session.id,
      reviewedAt: new Date(),
      rejectionReason: reason,
    },
  });

  await createAuditLog({
    userId: session.id,
    action: "REJECT",
    entityType: "Document",
    entityId: documentId,
    afterValue: { status: "REJECTED", reason },
  });

  revalidatePath("/documents");
  revalidatePath(`/documents/${documentId}`);

  return {};
}

// ─── Archive ──────────────────────────────────────────────────────────────────

export async function archiveDocument(
  documentId: string
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: "กรุณาเข้าสู่ระบบ" };

  if (!["OWNER", "MANAGER"].includes(session.role)) {
    return { error: "ไม่มีสิทธิ์จัดเก็บเอกสาร" };
  }

  await db.document.update({
    where: { id: documentId },
    data: { status: "ARCHIVED" },
  });

  await createAuditLog({
    userId: session.id,
    action: "ARCHIVE",
    entityType: "Document",
    entityId: documentId,
    afterValue: { status: "ARCHIVED" },
  });

  revalidatePath("/documents");

  return {};
}
