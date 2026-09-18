import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "กรุณาเข้าสู่ระบบ" } },
      { status: 401 }
    );
  }

  const rooms = await db.room.findMany({
    where: { active: true },
    include: { roomType: true },
    orderBy: { roomNumber: "asc" },
  });

  return NextResponse.json({ success: true, data: { rooms } });
}
