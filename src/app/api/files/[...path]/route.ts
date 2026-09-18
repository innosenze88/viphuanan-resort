import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { storage } from "@/lib/storage/storage";

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/files/[...path]">
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { path: pathSegments } = await ctx.params;
  const storagePath = Array.isArray(pathSegments)
    ? pathSegments.join("/")
    : pathSegments;

  try {
    const { buffer, mimeType } = await storage.download(storagePath);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
