import Link from "next/link";
import { formatDateTime } from "@/lib/utils";
import type { Document } from "@prisma/client";

type DocumentWithRelations = Document & {
  booking?: { bookingReference: string } | null;
  guest?: { fullName: string } | null;
};

const DOC_TYPE_LABEL: Record<string, string> = {
  PAYMENT_SLIP: "สลิปโอน",
  INVOICE: "ใบแจ้งหนี้",
  RECEIPT: "ใบเสร็จ",
  GUEST_ID: "บัตรประจำตัว",
  CONTRACT: "สัญญา",
  OTHER: "อื่นๆ",
};

const STATUS_CLASS: Record<string, string> = {
  PENDING_REVIEW: "bg-yellow-100 text-yellow-700",
  VERIFIED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  ARCHIVED: "bg-gray-100 text-gray-500",
};

type Props = {
  documents: DocumentWithRelations[];
  emptyMessage: string;
};

export function DocumentList({ documents, emptyMessage }: Props) {
  if (documents.length === 0) {
    return <div className="text-center py-12 text-gray-400">{emptyMessage}</div>;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="divide-y divide-gray-50">
        {documents.map((doc) => (
          <Link
            key={doc.id}
            href={`/documents/${doc.id}`}
            className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="text-2xl">{mimeIcon(doc.mimeType)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 truncate">{doc.fileName}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_CLASS[doc.status]}`}>
                  {doc.status === "PENDING_REVIEW" ? "รอตรวจ" :
                   doc.status === "VERIFIED" ? "ยืนยันแล้ว" :
                   doc.status === "REJECTED" ? "ปฏิเสธ" : "จัดเก็บ"}
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-3">
                <span>{DOC_TYPE_LABEL[doc.documentType] ?? doc.documentType}</span>
                {doc.booking && (
                  <span>การจอง {doc.booking.bookingReference}</span>
                )}
                {doc.guest && <span>{doc.guest.fullName}</span>}
                {doc.ocrConfidence != null && (
                  <span className={`font-medium ${doc.ocrConfidence >= 0.8 ? "text-green-600" : "text-yellow-600"}`}>
                    OCR {(doc.ocrConfidence * 100).toFixed(0)}%
                  </span>
                )}
                <span>{formatDateTime(doc.createdAt)}</span>
              </div>
            </div>
            <div className="text-xs text-gray-400 text-right shrink-0">
              {(doc.fileSize / 1024).toFixed(0)} KB
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function mimeIcon(mime: string) {
  if (mime === "application/pdf") return "📄";
  if (mime.startsWith("image/")) return "🖼️";
  return "📎";
}
