import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { storage } from "@/lib/storage/storage";
import { runOcr } from "@/lib/ocr/ocr";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit/audit";
import { DocumentType } from "@prisma/client";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const bookingId = formData.get("bookingId") as string | null;
  const guestId = formData.get("guestId") as string | null;
  const documentType = (formData.get("documentType") as DocumentType) || "OTHER";

  if (!file) {
    return NextResponse.json({ error: "ไม่พบไฟล์" }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "ประเภทไฟล์ไม่รองรับ — ใช้ JPG, PNG, WEBP หรือ PDF" },
      { status: 400 }
    );
  }

  // Check max file size from system settings
  const sizeSetting = await db.systemSetting.findUnique({
    where: { key: "upload.maxFileSizeMB" },
  });
  const maxMB = parseInt(sizeSetting?.value ?? "20", 10);
  if (file.size > maxMB * 1024 * 1024) {
    return NextResponse.json(
      { error: `ไฟล์ใหญ่เกิน ${maxMB} MB` },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Save file via storage provider
  const ref = await storage.upload(buffer, file.name, file.type);

  // Run OCR (async — result stored immediately; status starts PROCESSING → COMPLETED)
  let ocrRawText: string | undefined;
  let ocrConfidence: number | undefined;
  let ocrExtracted: Record<string, string | number | null> | undefined;
  let ocrStatus: "COMPLETED" | "FAILED" = "FAILED";

  try {
    const result = await runOcr(buffer, file.type);
    ocrRawText = result.rawText;
    ocrConfidence = result.confidence;
    ocrExtracted = result.extracted;
    ocrStatus = "COMPLETED";
  } catch {
    // OCR failure must not block the upload — document still saved as PENDING_REVIEW
  }

  const doc = await db.document.create({
    data: {
      fileName: ref.fileName,
      storagePath: ref.storagePath,
      mimeType: ref.mimeType,
      fileSize: ref.fileSize,
      fileHash: ref.fileHash,
      documentType,
      status: "PENDING_REVIEW",
      bookingId: bookingId || null,
      guestId: guestId || null,
      uploadedBy: session.id,
      ocrStatus,
      ocrRawText: ocrRawText ?? null,
      ocrConfidence: ocrConfidence ?? null,
      ocrExtracted: ocrExtracted ?? undefined,
    },
  });

  await createAuditLog({
    userId: session.id,
    action: "CREATE",
    entityType: "Document",
    entityId: doc.id,
    afterValue: {
      fileName: doc.fileName,
      documentType,
      ocrConfidence,
      bookingId,
    },
  });

  return NextResponse.json({ documentId: doc.id, ocrConfidence }, { status: 201 });
}
