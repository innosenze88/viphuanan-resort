import { NextRequest, NextResponse } from "next/server";
import { getSession, destroySession, SESSION_COOKIE } from "@/lib/auth/session";
import { createAuditLog, AuditAction } from "@/lib/audit/audit";

export async function POST(req: NextRequest) {
  const user = await getSession();

  if (user) {
    await createAuditLog({
      userId: user.id,
      action: AuditAction.LOGOUT,
      entityType: "user",
      entityId: user.id,
    });
  }

  await destroySession();

  const response = NextResponse.json({ success: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
