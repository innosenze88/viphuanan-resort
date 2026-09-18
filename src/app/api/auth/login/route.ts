import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyCredentials } from "@/lib/auth/auth";
import { createSession, SESSION_COOKIE } from "@/lib/auth/session";
import { createAuditLog, AuditAction } from "@/lib/audit/audit";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" } },
        { status: 400 }
      );
    }

    const user = await verifyCredentials(parsed.data.email, parsed.data.password);

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "AUTH_INVALID", message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" } },
        { status: 401 }
      );
    }

    const token = await createSession(user.id);

    await createAuditLog({
      userId: user.id,
      action: AuditAction.LOGIN,
      entityType: "user",
      entityId: user.id,
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
    });

    const response = NextResponse.json({ success: true, data: { user } });
    const isHttpsUrl = process.env.NEXTAUTH_URL?.startsWith("https://") ?? false;
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: isHttpsUrl,
      sameSite: "lax",
      maxAge: 12 * 60 * 60, // 12 hours
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "เกิดข้อผิดพลาด กรุณาลองใหม่" } },
      { status: 500 }
    );
  }
}
