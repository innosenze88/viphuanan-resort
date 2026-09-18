import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { storage } from "@/lib/storage/storage";
import { VerifyDocumentButton, RejectDocumentButton } from "@/components/documents/DocumentActions";

const DOC_TYPE_LABEL: Record<string, string> = {
  PAYMENT_SLIP: "สลิปโอนเงิน",
  INVOICE: "ใบแจ้งหนี้",
  RECEIPT: "ใบเสร็จ",
  GUEST_ID: "บัตรประจำตัว",
  CONTRACT: "สัญญา",
  OTHER: "อื่นๆ",
};

const STATUS_CLASS: Record<string, string> = {
  PENDING_REVIEW: "bg-yellow-100 text-yellow-800",
  VERIFIED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  ARCHIVED: "bg-gray-100 text-gray-700",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING_REVIEW: "รอตรวจสอบ",
  VERIFIED: "ยืนยันแล้ว",
  REJECTED: "ปฏิเสธแล้ว",
  ARCHIVED: "จัดเก็บแล้ว",
};

export default async function DocumentDetailPage(props: PageProps<"/documents/[id]">) {
  const { id } = await props.params;

  const doc = await db.document.findUnique({
    where: { id },
    include: {
      booking: { select: { id: true, bookingReference: true } },
      guest: { select: { id: true, fullName: true } },
    },
  });

  if (!doc) notFound();

  const fileUrl = storage.getUrl(doc.storagePath);
  const isImage = doc.mimeType.startsWith("image/");
  const isPdf = doc.mimeType === "application/pdf";

  const confidenceThreshold = parseFloat(
    (await db.systemSetting.findUnique({ where: { key: "ai.documentConfidenceThreshold" } }))
      ?.value ?? "0.80"
  );

  const confidenceOk =
    doc.ocrConfidence != null && doc.ocrConfidence >= confidenceThreshold;

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">{doc.fileName}</h1>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_CLASS[doc.status]}`}>
              {STATUS_LABEL[doc.status]}
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            {DOC_TYPE_LABEL[doc.documentType]} · {(doc.fileSize / 1024).toFixed(0)} KB
            {" · "}อัปโหลด {formatDateTime(doc.createdAt)}
          </p>
        </div>
        <Link href="/documents/inbox" className="text-sm text-blue-600 hover:underline">
          ← กลับ
        </Link>
      </div>

      {/* File Preview */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
        {isImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fileUrl}
            alt={doc.fileName}
            className="max-w-full mx-auto block max-h-96 object-contain p-4"
          />
        )}
        {isPdf && (
          <div className="p-6 text-center">
            <div className="text-4xl mb-2">📄</div>
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm"
            >
              เปิด PDF ในแท็บใหม่
            </a>
          </div>
        )}
        {!isImage && !isPdf && (
          <div className="p-6 text-center text-gray-400 text-sm">
            ไม่สามารถแสดงตัวอย่างไฟล์ประเภทนี้
          </div>
        )}
      </div>

      {/* OCR Results */}
      {doc.ocrStatus === "COMPLETED" && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">ผลการวิเคราะห์ OCR</h2>
            {doc.ocrConfidence != null && (
              <span className={`text-sm font-medium px-2.5 py-1 rounded-full ${
                confidenceOk ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
              }`}>
                ความเชื่อมั่น {(doc.ocrConfidence * 100).toFixed(1)}%
                {!confidenceOk && ` (ต่ำกว่า ${confidenceThreshold * 100}%)`}
              </span>
            )}
          </div>

          {!confidenceOk && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-800 mb-3">
              ⚠️ ความเชื่อมั่นต่ำกว่า threshold — ต้องตรวจสอบโดยมนุษย์เท่านั้น
            </div>
          )}

          {doc.ocrRawText && (
            <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 font-mono whitespace-pre-wrap">
              {doc.ocrRawText}
            </div>
          )}

          {doc.ocrExtracted && Object.keys(doc.ocrExtracted as object).length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              {Object.entries(doc.ocrExtracted as Record<string, unknown>).map(([k, v]) => (
                <div key={k} className="flex justify-between bg-gray-50 rounded px-3 py-2">
                  <span className="text-gray-500">{k}</span>
                  <span className="font-medium text-gray-800">{String(v ?? "-")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {doc.ocrStatus === "FAILED" && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          OCR ล้มเหลว — ตรวจสอบด้วยตาเท่านั้น
        </div>
      )}

      {/* Linked Records */}
      {(doc.booking || doc.guest) && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">เชื่อมโยงกับ</h2>
          <div className="space-y-2 text-sm">
            {doc.booking && (
              <div className="flex justify-between">
                <span className="text-gray-500">การจอง</span>
                <Link href={`/bookings/${doc.booking.id}`} className="text-blue-600 hover:underline font-medium">
                  {doc.booking.bookingReference}
                </Link>
              </div>
            )}
            {doc.guest && (
              <div className="flex justify-between">
                <span className="text-gray-500">แขก</span>
                <Link href={`/guests/${doc.guest.id}`} className="text-blue-600 hover:underline font-medium">
                  {doc.guest.fullName}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Review Actions */}
      {doc.status === "PENDING_REVIEW" && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">การตรวจสอบ</h2>
          <div className="space-y-3">
            <VerifyDocumentButton documentId={doc.id} />
            <RejectDocumentButton documentId={doc.id} />
          </div>
        </div>
      )}

      {/* Review Result */}
      {doc.status !== "PENDING_REVIEW" && doc.reviewedAt && (
        <div className={`rounded-xl border p-5 ${
          doc.status === "VERIFIED" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
        }`}>
          <h2 className="font-semibold mb-2">
            {doc.status === "VERIFIED" ? "ยืนยันแล้ว" : "ปฏิเสธแล้ว"}
          </h2>
          <p className="text-sm text-gray-600">{formatDateTime(doc.reviewedAt)}</p>
          {doc.reviewNotes && (
            <p className="text-sm mt-1">หมายเหตุ: {doc.reviewNotes}</p>
          )}
          {doc.rejectionReason && (
            <p className="text-sm mt-1 text-red-700">เหตุผล: {doc.rejectionReason}</p>
          )}
        </div>
      )}
    </div>
  );
}
