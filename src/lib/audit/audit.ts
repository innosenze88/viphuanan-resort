import { db } from "@/lib/db";
import { AuditAction } from "@prisma/client";

type AuditParams = {
  userId?: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  beforeValue?: unknown;
  afterValue?: unknown;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
};

export async function createAuditLog(params: AuditParams): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        beforeValue: params.beforeValue as never,
        afterValue: params.afterValue as never,
        reason: params.reason,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  } catch (err) {
    // Audit failure must not break the main operation — log and continue
    console.error("[AUDIT] Failed to write audit log:", err);
  }
}

export { AuditAction };
